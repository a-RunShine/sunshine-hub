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

set -uo pipefail

cd "$(dirname "$0")/.." || exit 1

if [ ! -f GLOSSARY.md ]; then
  echo "找不到 GLOSSARY.md" >&2
  exit 1
fi

# 正名：形如 **Campaign（售卖活动）**，英文和括号里的中文都算正名。
# 只提英文的话，「商品」会被当成排除词刷屏，因为它是 Product 的中文名。
canonical=$(grep -oE '^\*\*[A-Za-z][A-Za-z ]*（[^）]*）' GLOSSARY.md \
  | sed 's/^\*\*//; s/）$//' \
  | tr '（' '\n' \
  | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' \
  | grep -v '^$' \
  | sort -u)

# 术语表管不到的词：模块名、通用技术词。加之前先想清楚是不是真的该放过。
allow="交易 实名信息 序号 订单 退款 支付 履约 消息 用户"

# 排除词：形如 _Avoid_: 促销、秒杀活动
avoid=$(grep -o '_Avoid_: .*' GLOSSARY.md \
  | sed 's/_Avoid_: //' \
  | tr '、' '\n' \
  | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' \
  | grep -v '^$' \
  | sort -u)

# 减去正名和白名单，剩下的才是真正该报警的词
terms=$(comm -23 \
  <(printf '%s\n' "$avoid") \
  <(printf '%s\n' "$canonical" "$allow" | tr ' ' '\n' | grep -v '^$' | sort -u))

count=$(printf '%s\n' "$terms" | grep -c . || true)
echo "排除词 $(printf '%s\n' "$avoid" | grep -c .) 个，其中 $(printf '%s\n' "$canonical" | grep -c .) 个是别的概念的正名已剔除，实际检查 ${count} 个。"
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

  hits=$(grep -rnF $word_flag "$term" . \
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

  n=$(printf '%s' "$hits" | grep -c . || true)
  [ "$n" -eq 0 ] && continue

  echo "── ${term}（${n} 处）"
  printf '%s\n' "$hits" | head -3
  [ "$n" -gt 3 ] && echo "   ……还有 $((n - 3)) 处"
  echo
  found=1
done <<< "$terms"

if [ "$found" -eq 1 ]; then
  echo "以上是候选。逐条判断：指的是那个领域概念就改，口语泛称保留。"
else
  echo "没有命中任何排除词。"
fi

exit 0
