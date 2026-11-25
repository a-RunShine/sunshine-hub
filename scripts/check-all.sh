#!/usr/bin/env bash
#
# 本地一键全量校验：与 CI 的 backend / frontend / contract 三个 job 对齐。
#
# JDK 25 自动探测用于绕开 .jenv 默认的 17：enforcer 门槛是 [25,)，
# 不设对 JAVA_HOME 会在最开始就被拦下。
#
# 用法：
#   ./scripts/check-all.sh                # 全量校验
#   ./scripts/check-all.sh --fast         # 跳过 mvn verify
#   ./scripts/check-all.sh --skip-maven   # 同上，语义更直白
#   ./scripts/check-all.sh --dry-run      # 只打印将要执行的命令
#   ./scripts/check-all.sh --resolve-java-home  # 只打印解析出的 JAVA_HOME
#
# 退出码：0 全部通过；1 某一步失败或环境不满足。

set -uo pipefail

cd "$(dirname "$0")/.."

usage() {
  cat <<'EOF'
用法: ./scripts/check-all.sh [选项]

选项:
  --fast, --skip-maven   跳过 ./mvnw -B verify，其余校验照跑
  --dry-run              打印将执行的命令，不实际运行
  --resolve-java-home    打印解析出的 JDK 25 路径后退出
  --help, -h             打印本帮助，退出 0

环境变量:
  CHECK_ALL_JAVA_HOME        显式指定 JDK 25 路径，优先于自动探测
  CHECK_ALL_DISABLE_JAVA_PROBE=1  跳过固定路径与 java_home 探测，只认显式指定

退出码: 0 全部通过；1 某一步失败或找不到 JDK 25。
EOF
}

dry_run=0
skip_maven=0
resolve_only=0

for arg in "$@"; do
  case "$arg" in
    --help|-h) usage; exit 0 ;;
    --fast|--skip-maven) skip_maven=1 ;;
    --dry-run) dry_run=1 ;;
    --resolve-java-home) resolve_only=1 ;;
    *)
      echo "错误：未知参数 $arg" >&2
      usage >&2
      exit 1
      ;;
  esac
done

java_major() {
  local home=$1
  [ -x "$home/bin/java" ] || return 1
  local raw
  raw=$("$home/bin/java" -version 2>&1 | head -1)
  case "$raw" in
    *'"'*)
      raw=${raw#*\"}
      raw=${raw%%\"*}
      ;;
  esac
  printf '%s\n' "${raw#1.}" | grep -q '^25\.' || printf '%s\n' "$raw" | grep -q '^25$'
}

resolve_java_home() {
  local candidate
  for candidate in "${CHECK_ALL_JAVA_HOME:-}" "${JAVA_HOME:-}"; do
    [ -n "$candidate" ] || continue
    if java_major "$candidate"; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  if [ "${CHECK_ALL_DISABLE_JAVA_PROBE:-0}" = 1 ]; then
    return 1
  fi

  local mac_temurin=/Library/Java/JavaVirtualMachines/temurin-25.jdk/Contents/Home
  local mac_java_home=''
  if [ -x /usr/libexec/java_home ]; then
    mac_java_home=$(/usr/libexec/java_home -v 25 2>/dev/null || true)
  fi
  for candidate in "$mac_temurin" "$mac_java_home" "${HOME:-}/.local/jdk25/jdk-25.0.5+8"; do
    [ -n "$candidate" ] || continue
    if java_major "$candidate"; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

# --fast / --skip-maven 完全不碰 JDK：不跑 Maven 就没有 enforcer 拦路，
# 无 JDK 25 的机器也应该能跑前端与文档校验。
# --dry-run 不跳过 Maven 时只探测、不强制，探不到就打印占位符继续走。
if [ "$skip_maven" = 0 ] || [ "$resolve_only" = 1 ]; then
  if jdk_home=$(resolve_java_home); then
    export JAVA_HOME="$jdk_home"
    export PATH="$JAVA_HOME/bin:$PATH"
  elif [ "$resolve_only" = 1 ] || [ "$dry_run" = 0 ]; then
    cat >&2 <<'EOF'
错误：找不到 JDK 25。
本机 .jenv 默认指向 17，enforcer 会直接拦下构建。请安装 Temurin 25 后重试，或显式指定：
  CHECK_ALL_JAVA_HOME=/path/to/jdk-25 ./scripts/check-all.sh
要跑不依赖 Maven 的校验，用 --fast（等价 --skip-maven）。
EOF
    exit 1
  else
    JAVA_HOME='<未找到 JDK 25，--dry-run 仅占位>'
  fi
fi

if [ "$resolve_only" = 1 ]; then
  printf '%s\n' "$JAVA_HOME"
  exit 0
fi

failures=0

run_step() {
  local label=$1
  shift
  if [ "$dry_run" = 1 ]; then
    printf '[dry-run] %s: %s\n' "$label" "$*"
    return 0
  fi
  printf '\n==> %s\n' "$label"
  if "$@"; then
    return 0
  fi
  printf '失败：%s\n' "$label" >&2
  failures=$((failures + 1))
  return 1
}

if [ "$skip_maven" = 1 ]; then
  printf 'JAVA_HOME=%s（--skip-maven 不探测 JDK 25）\n' "${JAVA_HOME:-<未设置>}"
elif [ -x "${JAVA_HOME:-}/bin/java" ]; then
  printf 'JAVA_HOME=%s (%s)\n' "$JAVA_HOME" "$("$JAVA_HOME/bin/java" -version 2>&1 | head -1)"
else
  printf 'JAVA_HOME=%s\n' "${JAVA_HOME:-<未设置>}"
fi

run_step "前端全量校验" env -u NODE_ENV pnpm --dir web check
run_step "OpenAPI 契约校验" npx --yes @redocly/cli@latest lint api/openapi.yaml
run_step "文档链接与 wiki 孤儿页" node scripts/check-doc-links.mjs
run_step "术语检查脚本回归" ./scripts/test-check-glossary.sh
run_step "仓库脚本回归测试" node --test scripts/*.test.mjs
run_step "术语排除词候选" ./scripts/check-glossary.sh

if [ "$skip_maven" = 1 ]; then
  printf '\n已按 --skip-maven 跳过 ./mvnw -B verify\n'
else
  run_step "后端全量构建" ./mvnw -B verify
fi

if [ "$failures" -ne 0 ]; then
  printf '\n共有 %s 步失败。\n' "$failures" >&2
  exit 1
fi

printf '\n全部校验通过。\n'
