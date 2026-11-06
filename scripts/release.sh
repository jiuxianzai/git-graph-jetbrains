#!/usr/bin/env bash
#
# 一键发布 VS Code 扩展（打包 + 上传 Marketplace）
#
#   用法：
#     scripts/release.sh --dry-run     # 只构建 + 出 vsix，不发布（安全预演）
#     scripts/release.sh               # 构建 + 出 vsix + 询问后发布
#     scripts/release.sh --yes         # 同上，但跳过发布前确认（用于 CI/无人值守）
#
#   可选：
#     --skip-web      跳过 webview 构建（不推荐，会发出旧的 webview 产物）
#     --force         允许覆盖已存在的同名 vsix
#     --rehearse      演练浏览器上传：打包后打开管理页并选中 vsix，停在 Upload 按钮不提交
#
#   发布通道（环境变量 VSCE_CHANNEL）：
#     browser  默认，用 ego-browser 在 Marketplace 管理页上传 vsix，不需要任何 token
#     vsce     走 vsce publish，需要 PAT（VSCE_PAT / ~/.config/vsce/pat / vsce login）
#
#   凭据解析顺序（任选其一，脚本不会打印 token）：
#     1. 环境变量 VSCE_PAT
#     2. 文件 ~/.config/vsce/pat   （chmod 600，内容只有 PAT 一行）
#     3. 已执行过 `npx vsce login <publisher>`，凭据在系统钥匙串里
#
#   本脚本只做「打包 + 发布」，不改版本号、不碰 git（commit/tag/push 由你手动做）。

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DRY_RUN=0
ASSUME_YES=0
SKIP_WEB=0
FORCE=0
REHEARSE=0

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --yes|-y) ASSUME_YES=1 ;;
    --skip-web) SKIP_WEB=1 ;;
    --force) FORCE=1 ;;
    --rehearse) REHEARSE=1 ;;
    -h|--help) awk 'NR>1 { if ($0 !~ /^#/) exit; sub(/^# ?/, ""); print }' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "未知参数: $1（--help 查看用法）" >&2; exit 2 ;;
  esac
  shift
done

step() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
info() { printf '  %s\n' "$*"; }
warn() { printf '\033[1;33m  ! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- 预检
step "预检"

# pnpm 常装在 ~/Library/pnpm，非交互 shell 的 PATH 里可能没有
export PATH="$HOME/Library/pnpm:$PATH"

command -v node >/dev/null || die "找不到 node"
command -v pnpm >/dev/null || die "找不到 pnpm（期望在 \$HOME/Library/pnpm/pnpm）"

VSCE="$ROOT/node_modules/.bin/vsce"
[ -x "$VSCE" ] || die "找不到 node_modules/.bin/vsce，先跑一次 pnpm install"

NAME=$(node -p "require('./package.json').name")
PUBLISHER=$(node -p "require('./package.json').publisher")
VERSION=$(node -p "require('./package.json').version")
VSIX="$ROOT/${NAME}-${VERSION}.vsix"

info "扩展:   $PUBLISHER.$NAME"
info "版本:   $VERSION"
info "产物:   $(basename "$VSIX")"

# CHANGELOG 必须有对应版本条目，避免「发了版但没人知道改了什么」
grep -q "^## \[$VERSION\]" CHANGELOG.md \
  || die "CHANGELOG.md 缺少 '## [$VERSION]' 条目，先补更新日志再发布"

# 线上版本对比：避免把已经在线的版本再发一次（常见于「以为没发成功」）
LIVE_VERSION=$(node -e '
const q = {
  filters: [{ criteria: [{ filterType: 7, value: process.argv[1] }], pageNumber: 1, pageSize: 1 }],
  flags: 2,
};
fetch("https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery", {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json;api-version=7.1-preview.1" },
  body: JSON.stringify(q),
})
  .then((r) => r.json())
  .then((d) => {
    const v = d?.results?.[0]?.extensions?.[0]?.versions?.[0]?.version;
    if (v) console.log(v);
  })
  .catch(() => {});
' "$PUBLISHER.$NAME" 2>/dev/null)

if [ -n "$LIVE_VERSION" ]; then
  info "线上最新: $LIVE_VERSION"
  if [ "$LIVE_VERSION" = "$VERSION" ]; then
    if [ "$DRY_RUN" -eq 1 ]; then
      warn "线上已经是 ${VERSION}：这次构建只适合本机验收，发布前请先 bump 版本号"
    else
      die "线上已经是 ${VERSION}，无需重发。请先 bump package.json 版本号并在 CHANGELOG 加条目。"
    fi
  fi
else
  info "线上最新: （查询失败，跳过对比）"
fi

# 未提交改动只警告不阻塞（发布前你通常刚改完代码）
if [ -n "$(git status --porcelain)" ]; then
  warn "工作区有未提交改动："
  git status --short | sed 's/^/      /'
  warn "确认这些改动是你要发的内容（脚本不会替你 commit）"
fi

if [ -e "$VSIX" ] && [ "$FORCE" -eq 0 ]; then
  die "$(basename "$VSIX") 已存在；确认要覆盖请加 --force"
fi

# ---------------------------------------------------------------- 发布通道
# browser（默认）：走 ego-browser 打开 Marketplace 管理页上传，不需要任何 token
# vsce          ：走 vsce publish，需要 PAT
CHANNEL="${VSCE_CHANNEL:-browser}"

if [ "$CHANNEL" = "vsce" ]; then
  if [ -n "${VSCE_PAT:-}" ]; then
    TOKEN_SRC="环境变量 VSCE_PAT"
  elif [ -f "$HOME/.config/vsce/pat" ]; then
    VSCE_PAT=$(tr -d '[:space:]' < "$HOME/.config/vsce/pat")
    export VSCE_PAT
    TOKEN_SRC="文件 ~/.config/vsce/pat"
  elif [ -f "$HOME/.vsce" ] || [ -f "$HOME/.vsce/config" ]; then
    TOKEN_SRC="vsce 钥匙串登录"
  else
    TOKEN_SRC=""
  fi
  [ -z "$TOKEN_SRC" ] && die "VSCE_CHANNEL=vsce 但没有 PAT：
     a) npx vsce login $PUBLISHER
     b) echo 'PAT内容' > ~/.config/vsce/pat && chmod 600 ~/.config/vsce/pat
     c) export VSCE_PAT=...
   或者直接用默认的浏览器上传通道（不设 VSCE_CHANNEL 即可）。"
  info "通道:   vsce publish（凭据: $TOKEN_SRC）"
else
  command -v ego-browser >/dev/null || die "找不到 ego-browser（浏览器上传通道需要它）"
  info "通道:   ego-browser 管理页上传（无需 token）"
  info "前提:   该浏览器已登录拥有 $PUBLISHER 的微软账号"
fi

# ---------------------------------------------------------------- 构建
step "构建 extension (tsc + biome + esbuild --production)"
pnpm run package

if [ "$SKIP_WEB" -eq 0 ]; then
  step "构建 webview (vite build)"
  pnpm run build:web
else
  warn "已跳过 webview 构建（--skip-web）"
fi

# ---------------------------------------------------------------- 打包
step "打包 vsix"
"$VSCE" package --no-dependencies --allow-missing-repository -o "$VSIX"
[ -f "$VSIX" ] || die "打包失败，没有生成 $(basename "$VSIX")"
info "大小: $(du -h "$VSIX" | cut -f1)"

# ---------------------------------------------------------------- 发布
if [ "$DRY_RUN" -eq 1 ]; then
  step "dry-run 结束：只构建+打包，未上传"
  info "产物: $VSIX"
  info "本机验收: code --install-extension \"$VSIX\" --force"
  info "上传演练: scripts/release.sh --rehearse --force   （停在 Upload 按钮，不提交）"
  exit 0
fi

if [ "$ASSUME_YES" -eq 0 ]; then
  step "准备发布"
  info "即将上传 $PUBLISHER.$NAME@$VERSION 到 VS Code Marketplace"
  printf '  继续？[y/N] '
  read -r answer || answer=""
  case "$answer" in
    y|Y|yes|YES) ;;
    *) die "已取消（vsix 已生成，可直接手动发布）" ;;
  esac
fi

if [ "$REHEARSE" -eq 1 ]; then
  step "演练浏览器上传（不提交）"
  PUBLISH_FLAG=false
else
  step "发布到 Marketplace"
  PUBLISH_FLAG=true
fi

if [ "$CHANNEL" = "vsce" ]; then
  "$VSCE" publish --no-dependencies --packagePath "$VSIX"
else
  CFG=/tmp/vsce-upload-config.json
  node -e '
    const fs = require("node:fs");
    fs.writeFileSync(process.argv[1], JSON.stringify({
      vsix: process.argv[2],
      publisher: process.argv[3],
      publish: process.argv[4] === "true",
      spaceName: "marketplace upload",
    }, null, 2));
  ' "$CFG" "$VSIX" "$PUBLISHER" "$PUBLISH_FLAG"
  ego-browser nodejs < "$ROOT/scripts/marketplace-upload.mjs"
fi

step "完成"
info "扩展页: https://marketplace.visualstudio.com/items?itemName=$PUBLISHER.$NAME"
info "记得手动提交与打 tag：git commit -am \"release: $VERSION\" && git tag v$VERSION && git push --follow-tags"
