#!/usr/bin/env bash
#
# 扫术语表里的排除词，输出候选。
#
# 只提示，不判定，也不 fail。原因见 GLOSSARY 本身：「库存」是 Stock 的正名，
# 同时也是 Allocation 的排除词——同一个词在两种语境里一对一错，机械检查判不了。
# 脚本的价值是把「从零开始找」变成「从候选里挑」。
#
# 一个坑：术语表里某个概念的排除词，可能是另一个概念的正名。
# 比如 Event 的排除词是 Campaign，但 Campaign 本身是正名，全局搜会刷屏。
# 所以先把「正名」从排除词里剔掉，只留真正不该出现的词。
#
# 用法：./scripts/check-glossary.sh
#
# 测试专用开关：CHECK_GLOSSARY_FULL=1 跳过每词 head -3 截断，输出全部命中行。
# 它只影响展示条数上限，不改变匹配规则、白名单、复合词保护与退出码；
# 这是给测试断言取全量集合用的，日常运行不要带。

set -uo pipefail

cd "$(dirname "$0")/.." || exit 1

if [ ! -f GLOSSARY.md ]; then
  echo "找不到 GLOSSARY.md" >&2
  exit 1
fi

# --- 术语提取：显式按 UTF-8 解码，与运行环境 locale 无关 ---
# 旧实现用 `tr '、' '\n'` 拆排除词、`tr '（' '\n'` 拆正名。tr 按字节工作，
# 多字节字符会被切碎成 mojibake 碎片当成词条；C locale 下尤其明显，UTF-8
# locale 下同样不可靠。固定 locale 救不回来（不能假设 C.utf8 一定存在），
# 所以这里改用 python3 按 UTF-8 解码后再拆词，两种 locale 结果一致。
extract_terms() {
  local part=$1
  python3 - "$part" <<'PY'
import re
import sys

part = sys.argv[1]
canonical = set()
avoid = set()

with open("GLOSSARY.md", encoding="utf-8") as f:
    for line in f.read().splitlines():
        m = re.match(r"^\*\*[A-Za-z][A-Za-z ]*（[^）]*）", line)
        if m:
            head = m.group(0).lstrip("*").rstrip("）")
            en, zh = head.split("（", 1)
            for term in (en.strip(), zh.strip()):
                if term:
                    canonical.add(term)
        if "_Avoid_:" in line:
            for raw in line.split("_Avoid_:", 1)[1].split("、"):
                term = raw.strip()
                if term:
                    avoid.add(term)

for term in sorted(canonical if part == "canonical" else avoid):
    print(term)
PY
}

canonical=$(extract_terms canonical)
avoid=$(extract_terms avoid)

# 白名单：已核实为合法用法、不进候选的词。每条一行：词<TAB>放过理由。
# 加新条目前先确认它确实是模块名 / 通用技术词 / 正名语境，而不是把误报藏起来；
# 不要靠放宽匹配规则来消噪音。
allow_table='
交易	通用交易动作，不是 Order 概念本身
实名信息	采集的实名资料统称，不是 Real-name Hash 指纹
序号	通用序列编号说法，不特指收藏编号
订单	Order 的中文正名
退款	Refund 的中文正名
支付	通用支付动作
履约	Fulfillment 的中文正名
消息	通用消息通知，不是 Announcement 公告
用户	通用自然人称呼，不是 Account / Purchaser 概念
ID	资源标识的通用写法（资源 ID），不指收藏编号
item	OpenAPI items 结构名与 order_item 表名的组成部分，不是「物件」概念
'
allow_words=$(printf '%s\n' "$allow_table" | awk -F'\t' 'NF >= 2 { print $1 }')

# 复合词保护：左列排除词是右列更长合法词的子串。按行级剔除——只要行内
# 出现受保护复合词，整行从候选里去掉；词位级精度未做，此处是已知盲区。
# 只列已核实的复合词；匹配规则本身不放宽。
protected_table='
编号	收藏编号
抢购场	抢购场景
余量	剩余量
'
protected_compound_for() {
  awk -F'\t' -v term="$1" 'NF >= 2 && $1 == term { print $2 }' <<< "$protected_table"
}

# 减去正名和白名单，剩下的才是真正该报警的词
terms=$(comm -23 \
  <(printf '%s\n' "$avoid" | sort -u) \
  <(printf '%s\n' "$canonical" "$allow_words" | sort -u))

count=$(printf '%s\n' "$terms" | grep -c . || true)
avoid_count=$(printf '%s\n' "$avoid" | grep -c . || true)
canon_count=$(printf '%s\n' "$canonical" | grep -c . || true)
echo "排除词 ${avoid_count} 个，其中 ${canon_count} 个是别的概念的正名已剔除，实际检查 ${count} 个。"
echo

found=0
while IFS= read -r term; do
  [ -z "$term" ] && continue

  # 英文词用整词匹配，否则 item 会命中 items、ID 会命中哈希里的随机串
  if [[ "$term" =~ ^[A-Za-z] ]]; then
    word_flag="-w"
  else
    word_flag=""
  fi

  hits=$(grep -rnaF $word_flag "$term" . \
    --include='*.java' \
    --include='*.ts' \
    --include='*.tsx' \
    --include='*.yaml' \
    --include='*.yml' \
    --include='*.md' \
    --exclude-dir=node_modules \
    --exclude-dir=dist \
    --exclude-dir=target \
    --exclude-dir=.git \
    --exclude='GLOSSARY.md' \
    --exclude='api.ts' \
    --exclude='pnpm-lock.yaml' \
    --exclude='*.lock' \
    2>/dev/null)

  # 复合词保护（行级剔除，词位级精度未做，此处是已知盲区）：grep -vF 只要
  # 该行出现受保护复合词就整行剔除，不检查短词是否真的只出现在复合词里。
  # 同一句既有「收藏编号」又有独立「编号」写法时，整行会被连带放过；
  # 「抢购场→抢购场景」「余量→剩余量」同机制。
  compound=$(protected_compound_for "$term")
  if [ -n "$compound" ]; then
    hits=$(printf '%s\n' "$hits" | grep -vF "$compound" || true)
  fi

  n=$(printf '%s' "$hits" | grep -c . || true)
  [ "$n" -eq 0 ] && continue

  echo "── ${term}（${n} 处）"
  if [ "${CHECK_GLOSSARY_FULL:-0}" = "1" ]; then
    # 测试专用：不截断，输出全量命中行，供断言对完整集合取证。
    printf '%s\n' "$hits"
  else
    printf '%s\n' "$hits" | head -3
    [ "$n" -gt 3 ] && echo "   ……还有 $((n - 3)) 处"
  fi
  echo
  found=1
done <<< "$terms"

if [ "$found" -eq 1 ]; then
  echo "以上是候选。逐条判断：指的是那个领域概念就改，口语泛称保留。"
else
  echo "没有命中任何排除词。"
fi

exit 0
