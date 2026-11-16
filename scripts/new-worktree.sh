#!/usr/bin/env bash
#
# 建一个隔离 worktree，并把前端依赖软链过去。
#
# 每次给前端 ticket 起 worktree 都要重跑 pnpm install，几分钟里大部分时间
# 花在重建 node_modules 目录结构上，而包内容在 pnpm store 里已经有了。
# 软链过去能省掉这一步。
#
# 注意：软链意味着两个 worktree 共享同一份 node_modules。串行跑没问题，
# 并行跑两个前端 ticket 会互相覆盖。并行时请传 --no-link。
#
# 用法：./scripts/new-worktree.sh <branch> <dir> [base] [--no-link]

set -euo pipefail

branch=${1:?用法: new-worktree.sh <branch> <dir> [base] [--no-link]}
dir=${2:?用法: new-worktree.sh <branch> <dir> [base] [--no-link]}
base=${3:-HEAD}
link=${4:---link}

root=$(git rev-parse --show-toplevel)
abs_dir=$(cd "$(dirname "$dir")" && pwd)/$(basename "$dir")

git worktree add "$abs_dir" -b "$branch" "$base"

if [ "$link" = "--link" ] && [ -d "$root/web/node_modules" ] && [ -d "$abs_dir/web" ]; then
  ln -s "$root/web/node_modules" "$abs_dir/web/node_modules"
  echo "已把主仓库的 web/node_modules 软链过来，可以跳过 pnpm install。"
else
  echo "没软链依赖，进 worktree 后需要自己 pnpm install。"
fi
