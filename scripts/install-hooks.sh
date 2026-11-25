#!/usr/bin/env bash
#
# 启用仓库自带的 git hooks（.githooks/），零新增依赖，不引 Husky 或 root package.json。
#
# 用法：./scripts/install-hooks.sh
# 撤销：git config --unset core.hooksPath

set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -d .githooks ]; then
  echo "错误：找不到 .githooks 目录。" >&2
  exit 1
fi

chmod +x .githooks/* 2>/dev/null || true
git config core.hooksPath .githooks

echo "已设置 core.hooksPath = .githooks"
echo "生效的钩子：$(ls .githooks | tr '\n' ' ')"
