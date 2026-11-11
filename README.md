<div align="center">

<img src="https://raw.githubusercontent.com/jiuxianzai/git-graph-jetbrains/main/images/icon.png?v=2" width="96" />

# Git Graph (JetBrains)

**IntelliJ-style Git graph, commit panel and shelf for VS Code / Cursor — now with branch comparison and a full Simplified Chinese UI.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.85.0-007ACC.svg)](https://code.visualstudio.com/)
[![Marketplace](https://img.shields.io/visual-studio-marketplace/v/jiuxianzai.git-graph-jetbrains?label=marketplace)](https://marketplace.visualstudio.com/items?itemName=jiuxianzai.git-graph-jetbrains)
[![GitHub release](https://img.shields.io/github/v/release/jiuxianzai/git-graph-jetbrains?label=github)](https://github.com/jiuxianzai/git-graph-jetbrains/releases)

[English](./README.md) · [简体中文](./README.zh_CN.md)

</div>

> Community fork of [`aotemj/jetbrains-git-graph`](https://github.com/aotemj/jetbrains-git-graph), based on `0.4.17`. See [About this fork](#about-this-fork) for attribution and a detailed change list.

---

## Table of contents

- [Overview](#overview)
- [Screenshots](#screenshots)
- [Branch comparison](#branch-comparison)
- [Features](#features)
  - [Git log & graph](#git-log--graph)
  - [Branch tree](#branch-tree)
  - [Commit panel & shelves](#commit-panel--shelves)
  - [Merges & conflicts](#merges--conflicts)
  - [Commit actions](#commit-actions)
  - [File history & diffs](#file-history--diffs)
- [Installation](#installation)
- [Getting started](#getting-started)
- [Settings](#settings)
- [Requirements](#requirements)
- [Release notes](#release-notes)
- [About this fork](#about-this-fork)
- [Development](#development)
- [Credits & license](#credits--license)

---

## Overview

Git Graph (JetBrains) brings the IntelliJ/WebStorm Git workflow to VS Code and Cursor:

- a readable **commit graph** with lanes, refs and tags;
- an IDEA-style **commit panel** with changelists, shelves and stashes;
- a **3-way merge editor** and conflict list;
- a **branch comparison view** (new in 1.1) for reviewing what one branch has that another doesn't;
- a complete **English + Simplified Chinese** UI.

The extension works directly with the `git` CLI in your workspace, so it behaves the same on macOS, Windows and Linux.

## Screenshots

### Git log — graph, prefix-grouped branches, commit details

![Git log](https://raw.githubusercontent.com/jiuxianzai/git-graph-jetbrains/main/images/screenshots/git-log.png)

### Branch comparison — current branch vs `feature/login`

![Branch comparison](https://raw.githubusercontent.com/jiuxianzai/git-graph-jetbrains/main/images/screenshots/branch-compare.png)

## Branch comparison

Compare any branch with the branch you currently have checked out, without leaving the panel.

**Open it:** right-click a local or remote branch in the branch tree → **Compare Changes**. The branch sidebar's compare button opens the same view.

What you get:

- **Split commit view** — the top pane lists commits that exist only on the current branch, the bottom pane lists commits that exist only on the compared branch. Each pane keeps its own graph and scroll position, and the divider is draggable.
- **Ahead / behind counts** in the header (e.g. `feature/login`: 4 ahead, 2 behind), relative to the merge base.
- **Changed files per side** — the details pane gains a **Changed files** tab with a `target` / `base` switch. Clicking a file opens a side-by-side diff against the merge base (three-dot semantics), so changes that only exist on the other branch are never shown as reverse edits.
- **Commit details stay available** — click any commit in either pane to inspect it in the **Commit details** tab; the next/previous file-diff navigation still works.
- **Escape hatch** — close with the `×` button or **Esc**. The normal log and your previous filters come back.

The comparison is read-only: it only runs `git log`, `git merge-base`, `git rev-list` and `git diff`. Local and remote branches work, and a detached HEAD falls back to `HEAD`.

## Features

### Git log & graph

- Lane-based commit graph with branch/tag refs and merge lines.
- Collapsible linear commit sequences — click a sequence line to hide the commits in between.
- Filters for commit message, author, date range, branch and file history.
- Pagination for large repositories, with stable lane layout across pages.
- Toggleable author / date / hash columns; author and date stay pinned while the message area scrolls horizontally.
- Human-friendly dates (`Today 09:30`, `Yesterday 18:20`, `2026/10/01 12:05`) with the full timestamp on hover.

### Branch tree

- Branches grouped by `/` prefix into collapsible folders (`feature/login` → `feature ▸ login`), with branch counts and full-path tooltips.
- Current branch pinned at the top under **Local** and marked with a yellow star.
- New-branch dialog with a prefix picker (`feature/`, `bugfix/`, `hotfix/`, `release/`, `chore/`); the last prefix is remembered.

![New branch prefix picker](https://raw.githubusercontent.com/jiuxianzai/git-graph-jetbrains/main/images/screenshots/branch-prefix.png)

### Commit panel & shelves

- IDEA-style changelists with stage/unstage, per-file rollback and diff actions.
- **Shelve / unshelve** and stash support, including patch import/export.
- Conventional Commits type picker (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`); switching type rewrites only the prefix and preserves `(scope)` and `!`.
- Resizable commit-message box (about 1/3 of the panel by default, double-click the grip to reset, remembered per panel).
- Commit, commit-and-push, and a full push panel with progress and error feedback.

![Conventional Commit type picker](https://raw.githubusercontent.com/jiuxianzai/git-graph-jetbrains/main/images/screenshots/commit-types.png)

### Merges & conflicts

- Built-in 3-way merge editor (base / ours / theirs) with per-conflict resolution.
- Conflict list with accept-ours / accept-theirs actions.
- Broken merge or rebase states are detected, with a path back to a clean state.

### Commit actions

- Checkout (worktree-aware), new branch, rename, delete.
- Push, pull, fetch, rebase, merge.
- Cherry-pick, revert, reset (soft / mixed / hard), drop commit.
- Create branch or tag from any commit.

### File history & diffs

- Show file history from the editor and Explorer context menus.
- Next / previous file diff commands (`Cmd+F7` / `Cmd+Shift+F7` on macOS) for walking a commit's changed files.
- Changed-files context menu: show diff, edit source, open repository version, copy path.

## Installation

**From the Marketplace:**

```
ext install jiuxianzai.git-graph-jetbrains
```

or search for **Git Graph (JetBrains)** in the Extensions view.

**From a VSIX:**

```bash
code --install-extension git-graph-jetbrains-1.1.0.vsix
```

Download the latest VSIX from [GitHub Releases](https://github.com/jiuxianzai/git-graph-jetbrains/releases).

> If you previously installed `autemj.idea-like-git-graph`, the two extensions have different IDs and can coexist. Disable one of them to avoid duplicate views and context-menu entries.

## Getting started

1. **Open the log** — click the **JetGit** tab in the bottom panel, or run `JetGit: Focus on Git Log View` from the Command Palette.
2. **Browse** — use the branch tree and toolbar filters to narrow the graph; click a commit to see its files and details on the right.
3. **Compare branches** — right-click a branch → **Compare Changes**; switch the changed-files side in the details pane; press `Esc` to exit.
4. **Commit** — open the **Commit** view in the activity bar, review changed files, type a Conventional Commit message and commit.
5. **Language** — set `jetgit.language` to `en` or `zh-cn` (default `auto` follows the VS Code display language; reload the window after changing it).

## Settings

| Setting | Values | Default | Description |
| --- | --- | --- | --- |
| `jetgit.language` | `auto`, `en`, `zh-cn` | `auto` | UI language. `auto` follows the VS Code display language. Changing it prompts for a window reload. |

## Requirements

- VS Code `1.85.0` or newer (also works in Cursor and other VS Code-compatible editors).
- Git installed and available in `PATH`.

## Release notes

### 1.1.0 — 2026-11-11

- **Branch comparison with a split commit view** — compare any branch with the current one, with per-side graphs, ahead/behind counts and a draggable divider.
- **Per-side changed files with three-dot diffs** — inspect each side's changes against the merge base and open file-by-file diffs.
- **Fixes** — non-ASCII and spaced file paths in file lists, long branch names squeezing out commit subjects, and narrow-panel banner/tab clipping.

See [`CHANGELOG.md`](./CHANGELOG.md) for the full, bilingual history and [GitHub Releases](https://github.com/jiuxianzai/git-graph-jetbrains/releases) for downloadable VSIX files.

## About this fork

This repository is a **community fork**, not the original project.

- **Forked from:** [`aotemj/jetbrains-git-graph`](https://github.com/aotemj/jetbrains-git-graph) (at `0.4.17`)
- **Originally derived from:** [`zhyc9de/jet-git`](https://github.com/zhyc9de/jet-git)
- **This fork:** [`jiuxianzai/git-graph-jetbrains`](https://github.com/jiuxianzai/git-graph-jetbrains)
- **Marketplace ID:** `jiuxianzai.git-graph-jetbrains`

The original code and UI are the work of the upstream authors. This fork keeps the MIT license and the original copyright notices (see [`LICENSE`](./LICENSE)).

| Area | Change |
| --- | --- |
| **Branch comparison** | Right-click any branch → **Compare Changes**: split commit panes (current-only / target-only), ahead/behind counts, per-side changed files, three-dot diffs against the merge base, draggable divider, `Esc` to exit. |
| **Internationalization** | Complete English + Simplified Chinese UI. `jetgit.language` (`auto` / `en` / `zh-cn`); `auto` follows the VS Code display language. Manifest strings are localized via `package.nls*.json`. |
| **Branch tree** | Branches grouped by `/` prefix into collapsible folders (`feature/login` → `feature ▸ login`) with branch counts and full-path tooltips. Grouping is on by default; an explicit flat-list choice is remembered. |
| **Current branch** | Pinned as the first row under **Local**, marked with a filled yellow star. The old `当前分支: xxx` header was removed and the branch is no longer duplicated inside its folder. |
| **New branch dialog** | Prefix picker for `feature/`, `bugfix/`, `hotfix/`, `release/`, `chore/`; the last used prefix is remembered. A name containing `/` is kept as a full path. |
| **Commit message box** | Defaults to about **1/3 of the panel height**, with a drag grip, double-click reset and per-panel persistence. |
| **Conventional Commits** | Type dropdown that writes the `type: ` prefix. Switching types rewrites only the prefix and preserves `(scope)` and `!`. |
| **Git log layout** | Header row removed; smaller typography; author/date/hash left-aligned; hash hidden by default (toggle in the toolbar); default split **22% branch tree / 54% commit list / 24% details**, remembered per workspace. |
| **Dates** | Today → `今天 HH:mm`, yesterday → `昨天 HH:mm`, older → `YYYY/MM/DD HH:mm`; full timestamp on hover. Author/date columns are measured to fit their content. |
| **Wide commits** | When the log genuinely overflows, the graph and message scroll together horizontally while author/date stay pinned on the right. Long refs are ellipsized with tooltips. |
| **Interaction fixes** | Double-clicking a file in the commit panel no longer selects its text. Merge/rebase context-menu labels no longer end with `?`. |
| **Worktree-aware checkout** | When a branch is checked out in another worktree, checkout explains the situation and offers to **open that worktree in a new window**. Dirty-tree conflicts are explained instead of failing silently. |
| **Packaging** | Renamed to `jiuxianzai.git-graph-jetbrains` for this fork, starting at `1.0.0`; the current release is `1.1.0`. |

**Trademark disclaimer:** this is an independent, unofficial project. It is **not affiliated with, endorsed by, or sponsored by JetBrains s.r.o., Microsoft Corporation, or Anysphere (Cursor)**. “JetBrains”, “IntelliJ IDEA”, “WebStorm”, “PyCharm”, “GoLand” and “Rider” are trademarks of JetBrains s.r.o. “Visual Studio Code” is a trademark of Microsoft Corporation. All trademarks are used only to describe compatibility and inspiration.

## Development

```bash
pnpm install
cd webview && pnpm install && cd ..

pnpm run compile      # type-check + lint + extension bundle
pnpm run build:web    # webview bundle
pnpm run build        # both
pnpm run package      # production extension bundle
pnpm run vsce:package # produce a .vsix
```

Release helper (build + VSIX + Marketplace upload):

```bash
pnpm run release:dry       # build and package only
pnpm run release:rehearse  # open the upload dialog, stop before Upload
pnpm run release           # publish
```

## Credits & license

- Original project: [`zhyc9de/jet-git`](https://github.com/zhyc9de/jet-git)
- Upstream fork this work is based on: [`aotemj/jetbrains-git-graph`](https://github.com/aotemj/jetbrains-git-graph)
- This fork: [`jiuxianzai/git-graph-jetbrains`](https://github.com/jiuxianzai/git-graph-jetbrains)

MIT License. Original copyright notices are preserved in [`LICENSE`](./LICENSE).
