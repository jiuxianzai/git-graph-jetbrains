<div align="center">

<img src="https://raw.githubusercontent.com/jiuxianzai/jetbrains-git-graph/main/images/icon.png" width="96" />

# Git Graph (JetBrains)

**把 IntelliJ 风格的 Git 图谱、提交面板与 Shelf 带到 VS Code / Cursor，并提供完整简体中文界面。**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.85.0-007ACC.svg)](https://code.visualstudio.com/)

[English](./README.md) · [简体中文](./README.zh_CN.md)

</div>

---

## ⚠️ 分支说明与署名

本仓库是**社区分支**，不是原始项目。

- **Fork 自：** [`aotemj/jetbrains-git-graph`](https://github.com/aotemj/jetbrains-git-graph)  
  （本分支基于其 `0.4.17` 版本）
- **上游最初来源：** [`zhyc9de/jet-git`](https://github.com/zhyc9de/jet-git)
- **本分支仓库：** [`jiuxianzai/jetbrains-git-graph`](https://github.com/jiuxianzai/jetbrains-git-graph)
- **插件市场 ID：** `jiuxianzai.git-graph-jetbrains`

原始代码与界面的版权归上游作者所有。本分支保留 MIT 协议与原始版权声明
（见 [`LICENSE`](./LICENSE)），并在其基础上做了下述修改。

**商标声明：** 本项目是独立、非官方项目，与 JetBrains s.r.o.、Microsoft
Corporation、Anysphere（Cursor）**没有任何隶属、背书或赞助关系**。
“JetBrains”“IntelliJ IDEA”“WebStorm”“PyCharm”“GoLand”“Rider” 是
JetBrains s.r.o. 的商标；“Visual Studio Code” 是 Microsoft Corporation 的商标。
相关名称仅用于说明兼容性与设计灵感。

---

## 相比上游仓库改了什么

对比 `aotemj/jetbrains-git-graph` 的 `0.4.17`：

| 方面 | 改动 |
| --- | --- |
| **多语言** | 完整英文 + 简体中文界面；新增 `jetgit.language` 设置（`auto` / `en` / `zh-cn`），`auto` 跟随 VS Code 显示语言；插件清单通过 `package.nls*.json` 本地化。 |
| **分支树** | 按 `/` 前缀折叠成目录（`feature/login` → `feature ▸ login`），显示目录内分支数量与完整路径提示；目录分组默认开启，手动切平铺后会记住。 |
| **当前分支** | 固定排在「本地」第一行，最左侧用**黄色实心星标**标记；移除顶部「当前分支：xxx」标题，且不再在文件夹中重复出现。 |
| **新建分支** | 支持前缀选择：`feature/`、`bugfix/`、`hotfix/`、`release/`、`chore/`，记住上次选择；输入含 `/` 的名称按完整路径处理。 |
| **提交信息框** | 默认约占面板高度 **1/3**，上方拖动把手可调整高度，双击恢复默认，并按面板记住高度。 |
| **Conventional Commits** | 类型下拉框（`feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`build`、`ci`、`chore`、`revert`），选中即写入 `type: ` 前缀；切换类型只替换前缀，保留 `(scope)` 与 `!`。 |
| **日志布局** | 去掉表头；整体字号更小；作者/日期/哈希左对齐；哈希列默认不显示（工具栏眼睛菜单可开）；默认列宽比例 **分支树 22% / 提交列表 54% / 详情 24%**，按工作区记忆。 |
| **日期** | 今天显示 `今天 HH:mm`，昨天显示 `昨天 HH:mm`，更早显示 `YYYY/MM/DD HH:mm`；悬停显示完整时间；作者/日期列按内容自动定宽。 |
| **横向滚动** | 当日志确实放不下时，**图谱与消息一起横向滚动**，**作者/日期固定在右侧**；长分支标签在消息后显示，超出省略并可悬停查看。 |
| **交互修复** | 提交面板双击文件不再选中文字；合并/变基右键菜单项不再以 `?` 结尾（问号只保留在确认弹窗中）。 |
| **Worktree 检出** | 分支已在其他 worktree 检出时，给出明确提示并询问是否**在新窗口打开该 worktree**；未提交更改冲突也会说明原因，不再静默失败。 |
| **打包** | 本分支重命名为 `jiuxianzai.git-graph-jetbrains`，以 `1.0.0` 作为分支首个发布版本。 |

其余能力（Git 图谱引擎、提交/Shelf 面板、三方合并编辑器、冲突管理、
Cherry-Pick/Rebase/Merge、文件历史与右键菜单）均来自上游项目。

---

## 截图

### Git 日志：中文界面、前缀目录、当前分支置顶

![Git 日志](https://raw.githubusercontent.com/jiuxianzai/jetbrains-git-graph/main/images/screenshots/git-log.png)

### Conventional Commit 类型选择

![提交类型](https://raw.githubusercontent.com/jiuxianzai/jetbrains-git-graph/main/images/screenshots/commit-types.png)

### 新建分支的前缀选择

![分支前缀](https://raw.githubusercontent.com/jiuxianzai/jetbrains-git-graph/main/images/screenshots/branch-prefix.png)

---

## 继承自上游的功能

- **Git 图谱**：分支车道、refs、标签、可折叠线性序列
- **IDEA 风格提交面板**：更改列表、Shelf、Stash
- **分支管理**：检出、新建、重命名、删除、推送、拉取、比较
- **提交操作**：Cherry-Pick、Revert、Reset（soft/mixed/hard）、Drop Commit、建分支/标签
- **三方合并编辑器**与冲突列表
- **更改文件右键菜单**：查看差异、编辑源文件、打开仓库版本、复制路径
- **文件历史**：编辑器/资源管理器右键查看

---

## 安装

**插件市场（本分支发布后）：**

```
ext install jiuxianzai.git-graph-jetbrains
```

或在扩展市场搜索 **Git Graph (JetBrains)**。

**从 VSIX 安装：**

```bash
code --install-extension git-graph-jetbrains-1.0.0.vsix
```

> 如果之前安装过 `autemj.idea-like-git-graph`，两者 ID 不同，可以共存；
> 建议只启用其中一个，避免出现重复的视图和右键菜单。

---

## 设置

| 设置 | 可选值 | 默认 | 说明 |
| --- | --- | --- | --- |
| `jetgit.language` | `auto`、`en`、`zh-cn` | `auto` | 界面语言。`auto` 跟随 VS Code 显示语言；修改后会提示重载窗口。 |

---

## 环境要求

- VS Code `1.85.0` 或更高
- 已安装 Git，且 `git` 在 `PATH` 中

---

## 从源码构建

```bash
pnpm install
cd webview && pnpm install && cd ..

pnpm run compile      # 类型检查 + lint + 扩展打包
pnpm run build:web    # Webview 打包
pnpm run vsce:package # 生成 .vsix
```

---

## 致谢与协议

- 最初项目：[`zhyc9de/jet-git`](https://github.com/zhyc9de/jet-git)
- 本分支所基于的上游：[`aotemj/jetbrains-git-graph`](https://github.com/aotemj/jetbrains-git-graph)
- 本分支：[`jiuxianzai/jetbrains-git-graph`](https://github.com/jiuxianzai/jetbrains-git-graph)

MIT 协议，原始版权声明保留在 [`LICENSE`](./LICENSE) 中。
