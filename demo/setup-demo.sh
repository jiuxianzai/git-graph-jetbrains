#!/usr/bin/env bash
# Create a throwaway git repository used for the JetGit screenshots.
# Usage: ./demo/setup-demo.sh [target-dir]
set -euo pipefail

TARGET="${1:-/tmp/jetgit-demo}"

rm -rf "$TARGET"
mkdir -p "$TARGET"
cd "$TARGET"

git init -q -b main
git config user.name "Demo User"
git config user.email "demo@example.com"

printf '# JetGit demo\n\nA tiny repository with feature/, bugfix/, hotfix/ and release/ branches.\n' > README.md
printf 'console.log("hello from JetGit demo");\n' > app.js
git add README.md app.js
GIT_AUTHOR_DATE="2026-10-30T09:15:00" GIT_COMMITTER_DATE="2026-10-30T09:15:00" \
  git commit -qm "docs: initial demo project"

echo "demo change" >> app.js
git add app.js
GIT_AUTHOR_DATE="2026-11-03T18:20:00" GIT_COMMITTER_DATE="2026-11-03T18:20:00" \
  git commit -qm "fix: yesterday demo commit"

for branch in feature/login feature/payment bugfix/order-123 hotfix/1.2.1 release/2.0; do
  git checkout -q -b "$branch" main
  echo "$branch" > "$(echo "$branch" | tr '/' '-').txt"
  git add .
  GIT_AUTHOR_DATE="2026-11-04T12:05:00" GIT_COMMITTER_DATE="2026-11-04T12:05:00" \
    git commit -qm "feat: $branch"
done

git checkout -q main
git log --oneline --all --decorate
