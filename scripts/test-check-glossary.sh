#!/usr/bin/env bash
#
# check-glossary.sh 的轻量断言脚本。仓库没有 shell 测试框架，这里只做：
# 实跑脚本 + 解析输出 + 几条确定性断言，不引入依赖。
#
# 覆盖：
# - C 与 UTF-8 两种 locale 下候选词集合逐字节一致，退出码都是 0（advisory 不变）
# - 候选里没有 mojibake、单字碎片、截断词
# - 「大区」在被检查词表内，并能在 ADR-0009 / ADR-0011 报出候选
# - 收藏编号 / 资源 ID / 抢购场景 / 剩余量 不误报
# - 输出里不再出现 `binary file matches`
# - GLOSSARY.md 缺失时维持既有前置失败行为（exit 1 + 提示文案）
#
# 用法：./scripts/test-check-glossary.sh

set -uo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root" || exit 1

failures=0
fail() { echo "✗ $*"; failures=$((failures + 1)); }
pass() { echo "✓ $*"; }

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# --- 跑两种 locale ---
LC_ALL=C ./scripts/check-glossary.sh >"$tmp/C.out" 2>&1
c_exit=$?
LC_ALL=en_US.UTF-8 ./scripts/check-glossary.sh >"$tmp/utf8.out" 2>&1
u_exit=$?

if [ "$c_exit" -eq 0 ]; then pass "C locale 退出码 0（advisory）"; else fail "C locale 退出码 $c_exit"; fi
if [ "$u_exit" -eq 0 ]; then pass "UTF-8 locale 退出码 0（advisory）"; else fail "UTF-8 locale 退出码 $u_exit"; fi

# 候选词条目：形如 `── 词（N 处）`
terms_of() { grep -a '^── ' "$1" | sed -E 's/^── (.*)（[0-9]+ 处）$/\1/'; }

terms_of "$tmp/C.out" | sort -u >"$tmp/C.terms"
terms_of "$tmp/utf8.out" | sort -u >"$tmp/utf8.terms"

if cmp -s "$tmp/C.terms" "$tmp/utf8.terms"; then
  pass "两种 locale 候选词集合逐字节一致"
else
  fail "两种 locale 候选词集合不一致："
  diff "$tmp/C.terms" "$tmp/utf8.terms" | sed 's/^/    /' >&2
fi

# --- 无 mojibake / 单字碎片 / 已知截断词 ---
if python3 - "$tmp/utf8.terms" <<'PY'
import sys, re
bad = []
for line in open(sys.argv[1], encoding="utf-8"):
    t = line.strip()
    if not t:
        continue
    if "\ufffd" in t:
        bad.append(f"mojibake 词条: {t!r}")
    if len(t) == 1:
        bad.append(f"单字碎片: {t!r}")
for b in bad:
    print(b)
sys.exit(1 if bad else 0)
PY
then
  pass "无 mojibake、无单字碎片"
else
  fail "存在 mojibake 或单字碎片"
fi

fragment_hits=0
for bad in 件号 单 号 类 费 活动 类型; do
  if grep -qx "$bad" "$tmp/utf8.terms"; then
    fail "截断/碎片词仍在候选：$bad"
    fragment_hits=1
  fi
done
[ "$fragment_hits" -eq 0 ] && pass "已知截断词（件号/单/号/类/费/活动/类型）均不在候选"

# --- 「大区」必须被收进排除词并能报出候选 ---
if grep -q '_Avoid_:.*大区' GLOSSARY.md; then
  pass "GLOSSARY.md 已把「大区」列入排除词"
else
  fail "GLOSSARY.md 未把「大区」列入排除词"
fi

if grep -aq '^── 大区（' "$tmp/utf8.out"; then
  pass "脚本把「大区」报为候选"
else
  fail "脚本未把「大区」报为候选"
fi

# 「大区」候选的命中行要覆盖 ADR-0009 与 ADR-0011
section_of() { # $1 词条, $2 文件 → 打印该词条小节下的命中行
  awk -v prefix="── $1（" '
    $0 ~ ("^" prefix) { in_section = 1; next }
    /^── / { in_section = 0 }
    in_section { print }
  ' "$2"
}

for adr in 0009-real-name-at-purchase.md 0011-no-regional-stock.md; do
  if section_of 大区 "$tmp/utf8.out" | grep -q "docs/adr/$adr"; then
    pass "「大区」候选命中 $adr"
  else
    fail "「大区」候选未命中 $adr"
  fi
done

# --- 误报不得出现 ---
if grep -qx 'ID' "$tmp/utf8.terms"; then
  fail "资源标识 ID 被误报为候选"
else
  pass "资源标识 ID 不进候选"
fi
if grep -qx 'item' "$tmp/utf8.terms"; then
  fail "item（items / order_item）被误报为候选"
else
  pass "item 不进候选"
fi

if section_of 编号 "$tmp/utf8.out" | grep -q '收藏编号'; then
  fail "「收藏编号」被「编号」子串误报"
else
  pass "「收藏编号」不因含「编号」被报"
fi
if section_of 抢购场 "$tmp/utf8.out" | grep -q '抢购场景'; then
  fail "「抢购场景」被「抢购场」子串误报"
else
  pass "「抢购场景」不被「抢购场」命中"
fi
if section_of 余量 "$tmp/utf8.out" | grep -q '剩余量'; then
  fail "「剩余量」被「余量」子串误报"
else
  pass "「剩余量」不被「余量」命中"
fi

# --- 不再有 binary file matches 警告 ---
if grep -aqi 'binary file matches' "$tmp/utf8.out" || grep -aqi 'binary file matches' "$tmp/C.out"; then
  fail "输出里仍有 grep binary file matches 警告"
else
  pass "无 binary file matches 警告"
fi

# --- GLOSSARY.md 缺失：既有前置失败行为保持原样 ---
miss_dir="$tmp/missing"
mkdir -p "$miss_dir/scripts"
cp scripts/check-glossary.sh "$miss_dir/scripts/"
( cd "$miss_dir" && ./scripts/check-glossary.sh >out.txt 2>err.txt )
miss_exit=$?
if [ "$miss_exit" -eq 1 ]; then
  pass "缺 GLOSSARY.md 时前置失败 exit 1"
else
  fail "缺 GLOSSARY.md 时退出码 $miss_exit（应为 1）"
fi
if grep -q '找不到 GLOSSARY.md' "$miss_dir/err.txt"; then
  pass "缺 GLOSSARY.md 的提示文案保持原样"
else
  fail "缺 GLOSSARY.md 的提示文案缺失"
fi

echo
if [ "$failures" -eq 0 ]; then
  echo "全部断言通过。"
  exit 0
else
  echo "$failures 条断言失败。"
  exit 1
fi
