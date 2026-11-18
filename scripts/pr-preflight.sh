#!/usr/bin/env bash
#
# PR 合并竞态前置检查：push 到 PR 分支、或 gh pr edit 改正文之前，先确认 PR 还 OPEN。
#
# 背景：PR 是共享状态，owner 随时可能已经合并。上一轮 PR #38 被 squash 合并后，
# 代理还往同一个分支 push，那笔提交（440227c）没进 main，只能另开 #40 补交。
# 这个脚本在动手前先查一次 PR 状态，把这类事故挡在 push 之前。
#
# 用法：scripts/pr-preflight.sh <pr-number>
#   --help  打印用法与退出码含义，退出 0
#
# 退出码：
#   0  OPEN：可以 push / 编辑正文
#   2  MERGED：不要再 push 旧分支，从最新 main 开新分支重做
#   3  CLOSED：同上，按关闭处理
#   4  PR 不存在：确认编号
#   1  用法错误、gh 缺失/未登录，或其他查询失败

set -euo pipefail

cd "$(dirname "$0")/.."

usage() {
  cat <<'EOF'
用法: scripts/pr-preflight.sh <pr-number>

在 push 到 PR 分支、或 gh pr edit 改 PR 正文之前先跑一次，确认这张 PR 仍是 OPEN。

参数:
  <pr-number>  PR 编号（纯数字）
  --help       打印本帮助，退出 0

退出码:
  0  PR 为 OPEN：可以 push / 编辑正文；push 后再核对 headRefOid 是否更新
  2  PR 已 MERGED：不要再 push 旧分支，从最新 main 开新分支重做
  3  PR 已 CLOSED：同上，按关闭处理
  4  PR 不存在：确认编号
  1  用法错误、gh 未安装/未登录，或其他查询失败
EOF
}

# --- 参数解析 ---
if [ $# -eq 0 ]; then
  echo "错误：缺少 PR 编号。" >&2
  usage >&2
  exit 1
fi

case "$1" in
  --help|-h)
    usage
    exit 0
    ;;
esac

pr="$1"
if ! [[ "$pr" =~ ^[0-9]+$ ]]; then
  echo "错误：PR 编号必须是纯数字，收到：$pr" >&2
  usage >&2
  exit 1
fi

# --- 环境检查 ---
if ! command -v gh >/dev/null 2>&1; then
  echo "错误：找不到 gh CLI，请先安装 GitHub CLI。" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "错误：gh 未登录。先执行 gh auth login，再跑本脚本。" >&2
  exit 1
fi

# --- 查询 PR 状态 ---
# 不依赖外部 jq：gh 内置 --jq 一次取出四个字段，用 | 分隔。
# 查不到时 gh 退出非零、错误信息走 stderr，合并进捕获结果后区分 not found。
view=$(gh pr view "$pr" --json state,headRefOid,number,url \
  --jq '"\(.number)|\(.state)|\(.headRefOid)|\(.url)"' 2>&1) || {
  if printf '%s' "$view" | grep -qi "Could not resolve to a PullRequest"; then
    echo "错误：PR #$pr 不存在，确认编号是否正确。" >&2
    exit 4
  fi
  echo "错误：查询 PR #$pr 失败：" >&2
  printf '%s\n' "$view" >&2
  exit 1
}

IFS='|' read -r number state head_ref_oid url <<< "$view"

case "$state" in
  OPEN)
    echo "PR #$number 处于 OPEN，可以 push / 编辑正文。"
    echo "  链接：$url"
    echo "  headRefOid：$head_ref_oid"
    echo "push 后再核对 headRefOid 是否更新。"
    exit 0
    ;;
  MERGED|CLOSED)
    cat >&2 <<EOF
PR #$number 已 $state，不要再继续 push 这张 PR 的旧分支。
合并（或关闭）之后再 push 的提交不会进 main；需要保留这笔改动时，从最新 main 开新分支，把改动 cherry-pick 或重做，再开新 PR：

  git fetch origin
  git switch -c <type>/<短描述> origin/main
  git cherry-pick <sha>          # 或在新分支上重做这笔改动
  git push -u origin <branch>
  gh pr create --base main

  链接：$url
EOF
    if [ "$state" = "MERGED" ]; then
      exit 2
    else
      exit 3
    fi
    ;;
  *)
    echo "错误：未知 PR 状态：$state" >&2
    exit 1
    ;;
esac
