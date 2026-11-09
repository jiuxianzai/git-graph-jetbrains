# Release Packages

按版本存放 JetGit 的 VSIX 安装包。目录名与 git tag 保持一致（`v1.0.x`）。

| 版本 | 线上状态 | 安装包 |
| --- | --- | --- |
| v1.0.0 | 已发布 | `v1.0.0/git-graph-jetbrains-1.0.0.vsix` |
| v1.0.1 | 已发布 | `v1.0.1/git-graph-jetbrains-1.0.1.vsix` |
| v1.0.2 | 未发布（本地构建） | `v1.0.2/git-graph-jetbrains-1.0.2.vsix` |
| v1.0.3 | 已发布 | `v1.0.3/git-graph-jetbrains-1.0.3.vsix` |
| v1.0.4 | 已发布（当前线上版本） | `v1.0.4/git-graph-jetbrains-1.0.4.vsix` |
| v1.0.5 | 待上传 | `v1.0.5/git-graph-jetbrains-1.0.5.vsix` |

`legacy/` 只保留历史改名前的旧包，不作为发布产物使用。

- 新的打包会由 `scripts/release.sh` 自动写入 `releases/v<version>/`
- 线上扩展 ID：`jiuxianzai.git-graph-jetbrains`
- 0.x 旧包（`idea-like-git-graph-0.4.*`）已移出仓库，归档在 `/tmp/jetgit-0x-vsix-archive/`
- VSIX 已被 `.gitignore` / `.vscodeignore` 忽略，不会进入发布包
