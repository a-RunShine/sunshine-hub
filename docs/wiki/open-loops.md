# 未结的环

等着谁、卡在哪。结掉的就移到下面「已结」并留日期，不要删——删了就看不出这件事曾经卡过。

相关页：[index](index.md) · [stages](stages.md) · [contract-gaps](contract-gaps.md) · [decisions-2026-11-16](decisions-2026-11-16.md) · [issue-3-review](issue-3-review.md) · [guardrails](guardrails.md) · [environment](environment.md)

## 已拍板（2026-11-16）

- **2026-11-16**：阶段 0 完成后做阶段 1 还是阶段 2 —— **用户已拍板：先补契约，再开阶段 1 抢购页**。理由见 [contract-gaps](contract-gaps.md)：契约是阶段 1 与 2 的唯一硬依赖，不补两边都会照着不足的契约往下写。
- **2026-11-16**：是否先做环境护栏修补 —— **用户已拍板：先修一轮护栏**。范围与进展见 [guardrails](guardrails.md)，在 worktree `../sunshine-hub-guardrails`、分支 `chore/guardrails` 上进行。
- 两条并行推进：护栏改 `ci.yml`/`scripts/`/`pom.xml`/`web` 配置，契约改 `api/openapi.yaml` 与 issue 正文，互不重叠。

### 两个契约决策已拍板（2026-11-16，原挂起节已移入「已结」）

**2026-11-16**：owner 拍板 **D1 / D2 / D3**，原先挂起的两个问题都有了答案。**决策本身、推翻了哪些 ADR 行、单向门代价，记在 [decisions-2026-11-16](decisions-2026-11-16.md)**；原挂起节的文字按本层规矩移入下方「已结」并标 superseded，不删。

- **D1**：限时抢购每人限购**可配置、可 2 件以上，每场独立额度、不跨场累计**，仍按实名判定。→ 契约字段定为 `remainingQuota: [integer,'null']`。
- **D2**：**取消永久失格**，改两档冷却（不足 3 次 → 24h；满 3 次 → **7 天**），均自动恢复，**不需人工解封入口**。
- **D3**：第五个禁用态 = **失格/冷却**；未实名/未登录不是禁用态。

**修订已派工**：ADR 与 GLOSSARY 的改写、issue #2 的同步，交给 worktree **`../sunshine-hub-decisions`**、分支 **`docs/limit-cooldown-decisions`**（复核时位于 `c5b5508`）。**本会话只写 `docs/wiki/`，没碰那些文件。**

### 新未结：D1 / D2 带出来的（2026-11-16）

- **限购键改名是单向门。** `limit:{productId}:{realNameHash}`（#2:187）→ 按 `campaignId` 挂。**旧键数据不迁移，回退等于额度清零重卖。** 要双向可逆就得写迁移 + 双写窗口。具体新键名 owner 没给字面串，以 decisions worker 落进 ADR 的那份为准。见 [decisions-2026-11-16](decisions-2026-11-16.md)。
- **唯一索引机制待换（#3 P0-9，已触发）。** `uk_purchase (purchaser_hash, product_id, limit_flag)`（#2:177）只能表达 1 件，D1 要求 N>1。**不换机制，`remainingQuota` 就没有可信数据来源。** 这条从「待 triage 的缺陷」升级为「必修」，且索引变更本身也是单向门。
- **#3 P0-2 需重新评估，性质变了。** 跨场 `total_limit` 不守恒这条，在「每场独立额度」下**不是变轻，可能变重**：D1 让「另开一场就重新给额度」成为合法路径，于是**跨场总量守恒成了唯一剩下的刹车**。另：P0-2 举的例子用「回流场」，而 [ADR-0003](../adr/0003-repool-as-delayed-release.md):3 规定回流不另开场次——**例子本身也要重写**。详见 [issue-3-review](issue-3-review.md)。
- **`miss` 计数的 scope 与清零规则没拍。** D1 只说限购键改挂 `campaignId`，**没说 `miss:{productId}:{realNameHash}`（#2:188）跟不跟**。按商品累计还是按场累计，直接决定「换一场能不能洗掉冷却」。另：7 天冷却到期后计数是否清零、#2:196 的「24 小时内累计」窗口是否保留，都未定。
- **`CampaignDetail` 拆分方式仍未拍。** [contract-gaps](contract-gaps.md) 缺口 3 推荐的 `oneOf` + `discriminator(type)` 还是提案。
- **旧词清理范围扩大了。** 「跨场累计」「一人一单」「永久失格」都成了本轮旧词，按 [workflow](workflow.md) 要全仓搜，范围含 `GLOSSARY.md`:92 的 Purchase Limit 定义、#2:402 第三个测试用例、模型图与 Redis 键。**属 decisions worker，本层不动。**

### 「先补契约」有前置：#3 的 P0-7 与 P0-9（2026-11-16）

**2026-11-16 复核**：上面第一条拍板**不能干净地直接执行**。补契约时有两处改不动，答案都在还没 triage 的 #3 里：

- **P0-7**（限购键生存期矛盾、永久失格无处安放）＝ [contract-gaps](contract-gaps.md) 推导出的**第五个禁用态「失格/冷却」**。**同一件事，不要修两次。** 键结构不定，错误码就定不下来——「已购」与「失格」现在共用一个键，所以分不开。
- **P0-9**（唯一索引表达力上限 1 件）**决定限购字段的类型**：`purchased: boolean` 还是 `remainingQuota: integer`。先写 schema 后拍它，会先把一个表达错的字段写进契约再返工。

**所以顺序是：triage P0-7 / P0-9 → 定键结构与限购语义 → 再改 `api/openapi.yaml`。** 逐条重叠分析见 [issue-3-review](issue-3-review.md)。

~~**待 owner 拍板的四个问题**列在 [contract-gaps](contract-gaps.md) 末节（「五」的口径、限购字段形态、`CampaignDetail` 拆分方式、永久失格是否进首版）。~~

> **2026-11-16 更正（部分 superseded）**：上面划掉那句里的问题**三个已拍**（D1/D2/D3），只剩 `CampaignDetail` 拆分方式未拍。本节两条前置的状态也变了：
>
> - **P0-7 部分已解**：D2 取消永久失格，「无处安放」的那一档没了。**但键生存期矛盾仍在**——`miss` 的 scope 与清零规则没拍，24h 计数窗口与 7 天冷却的关系要重述。
> - **P0-9 不是「决定字段类型」了，是「必须修」**：D1 已定 `remainingQuota`，字段类型不再悬空；但 N>1 让旧唯一索引机制**确定不够用**，它现在是契约改动的硬前置。
>
> **顺序不变，内容变了**：现在是「换索引机制 + 定 `miss` 规则 → 再改 `api/openapi.yaml`」。

## 等 triage

- **2026-11-16 复核**：**issue #3「文档与决策审查：P0 九处模型硬伤，P1 十处规格缺口」** 挂着 `needs-triage` + `docs`，**还没人评估**。标题自称有九处 P0 模型硬伤——**在阶段 1/2 开工前值得先读一遍**，否则可能照着有硬伤的模型实现。~~本次侦察没有逐条核实那九处，只确认了 issue 状态与标签。~~

  **2026-11-16 更正（superseded）**：上面划掉那句已不成立——**九条 P0 已逐条读过并分类**，结果在 [issue-3-review](issue-3-review.md)。同时发现 **#3 自己有四处已过时**（审查范围只到 ADR-0007、P3-2 方向反了、P1-3 已被阶段 0 解决、P3-13 的 Unit 已画进模型图）。**#3 仍是 OPEN + `needs-triage`，其中 P0-7 / P0-9 现在阻塞契约修复**，见上。

- **2026-11-16**：**issue #27「chore: 术语检查扩到 issue 正文，堵住评审看不到的旧词」已提交**，挂 `needs-triage`。它正是下面「大区」那一节的机器兜底方案：issue 正文的改动不进 PR diff，评审拦不住。#27 自己列了五个待定设计问题（命中之后拦谁、CI token 权限、扫哪些 issue、分页与频率限制、与仓库内检查的策略关系），**不是拿来就能做的 ticket**。

  边界已划清：`chore/guardrails` 那一轮只把**仓库内**检查从 advisory 改成 blocking，**不含 issue 正文**，避免把 CI 的对外依赖混进那个 PR。

  **2026-11-16 更正（superseded）**：上面这句「那一轮只把仓库内检查改成 blocking」**没发生**。worker 跑脚本时发现提取逻辑本身有缺陷、且存在合法口语命中，按指令**跳过了这一项**，只做 wrapper / 版本固定 / JDK 门禁，成果是 **PR #28**（`ci.yml`、`mvnw`、`.mvn/wrapper/`、`pom.xml`、`web/.nvmrc`、`web/package.json`）。术语护栏整件事另立 **issue #29**，范围含修 locale、补「大区」排除词、修误报，**修干净之后才改 blocking**——顺序不能反，否则一开就拦住所有 PR。

  **依赖已登记**：#27 blocked by #29（先让仓库内检查真的能用，再扩到 issue 正文）。登记时踩到一个读延迟的坑，见 [environment](environment.md)。

## 已知但未做（环境护栏）

来自 **2026-11-16 交接记录**，属于「有偏差先修，再做功能」那一类：

- **`actions/setup-java@v4` 已废弃**，建议升 v5，CI 日志里有提示。
- **术语检查脚本只输出候选不 fail**，CI 里能看到但不会拦人。等于 [workflow](workflow.md) 的全仓搜旧词纪律没有机器兜底。
- **阶段 1 的 MSW handler 只有骨架用的几条**，页面实现时要按契约补齐。

**2026-11-16 复核：三条全部确认仍然存在**（`c5b5508`）。逐条证据与「拦不拦」的判定见 [guardrails](guardrails.md)：`ci.yml:15` 仍是 `setup-java@v4`；`scripts/check-glossary.sh:97` 是 `exit 0`；`web/src/mocks/handlers.ts` 只有 7 个 handler，且 claim handler（`:109-119`）**无条件返回 201，造不出任何失败态**。

> **2026-11-16 更正（superseded）**：上面第二条「术语检查脚本只输出候选不 fail」**说轻了**。同日历轮护栏 worker（分支 `chore/guardrails`）发现它**不只是 advisory，提取本身是坏的**：`tr '、' '\n'` 在 C locale 下按字节切，把多字节 UTF-8 打成乱码碎片当成术语；而且 `GLOSSARY.md` 根本没把「大区」收进排除词，**它从来就抓不到漏进 #7 第 50 行的那个词**。两条带日期的证据见 [guardrails](guardrails.md) 与 [environment](environment.md)。**「跑绿了不代表旧词清干净」要升级成「跑出来的候选本身不可信」。**

## 契约缺口阻塞抢购页

- **2026-11-16 复核**：**[contract-gaps](contract-gaps.md) 是阶段 1 抢购页的前置，不是它的实现细节。** 五处缺口里四处要改 `api/openapi.yaml`（编号池异常无 5xx 出口、点击前拿不到已购/限购态、`allocation` 非必填、匿名接口返回用户专属 `reserved`），第五处是「五种按钮禁用态」根本没有权威清单。

  按 issue #7 的依赖图，契约是阶段 1 与阶段 2 的**唯一硬依赖**，所以这几处不补，**两个阶段都会照着不足的契约往下写**。

  这件事同时验证了交接记录「早做抢购页能暴露契约缺口」的判断——缺口在写代码之前就浮出来了。

  **2026-11-16 更新**：第五处（五种禁用态无权威清单）**已由 D3 解决**，清单见 [contract-gaps](contract-gaps.md)。缺口 2 的字段也已定为 `remainingQuota`。**但「四处要改契约」这个判断没变**，而且改契约现在多了一个硬前置：唯一索引机制必须换（#3 P0-9，D1 触发）。

## 阶段 1/2 还没拆 ticket

- **2026-11-16 复核**：**阶段 1 与阶段 2 各自仍是 #7 里的一个大段落，没有 per-ticket 子 issue。** 只有阶段 0 拆过（#11 + #14–#18 + 评审修复 #20–#24，全部 CLOSED）。

  [workflow](workflow.md) 的约定是「每个 ticket 一个 worktree，派 subagent 实现」——**没有 ticket 就没有 worktree 的边界**，这条约定现在无从执行。实现前必须先拆。

- **2026-11-16 复核**：**`module:*` 标签一个都还没建**（现有 6 个标签里没有）。`AGENTS.md` 说「第一个模块落地时按模块名创建，此后每个 issue 至少带一个」，拆 ticket 时要一并建，按模块边界拆。详见 [stages](stages.md)。

## 概念改了一半：issue #7 的「大区」

- **2026-11-16 复核**：**issue #7 第 50 行仍写着 `| 身份 | 注册（含实名、大区）、登录 |`**，与它自己的第 11 行（「实名不在注册时填」「注册只要用户名和密码」）和第 13 行（「早期设计里的『大区』已经整个删掉」）**直接矛盾**，也违反 [ADR-0009](../adr/0009-real-name-at-purchase.md) 与 [ADR-0011](../adr/0011-no-regional-stock.md)。

  **PR #25 的 issue 同步是不完整的。** 它的 commit message（`38d2eee`）声称「issue #7 的三处改成指向 ADR-0008 / 0009 / 0011 的完整链接」——前置段落那几处确实改了（第 11、13 行现在带完整链接），**但阶段 1 页面清单那一行漏了**。PR #25 的 diff 只含 `api/openapi.yaml` 与 `docs/adr/0008-session-over-jwt.md`，issue 正文的改动不在 diff 里，**评审看不到，所以漏了也没人拦**。

  这正是 `AGENTS.md` 与 [workflow](workflow.md) 警告的「概念改一半」：两种叫法并存，旧的那半没人维护，**下一个 agent 会照着第 50 行去实现「注册时填实名和大区」**。而 [guardrails](guardrails.md) 说明了术语检查是 advisory，机器不会拦。

  待办：改 issue #7 第 50 行。**本次侦察是只读的，没有动它。**

### 旧词逐条判定（2026-11-16 全仓 + #2/#3/#7 复核）

`AGENTS.md` 说「`grep -rn` 能找到一半，判断哪个词算旧词靠人」。**下面是逐条判定，不是命中数。** 搜索词：`大区 / 地域 / region / 华东 / 华南 / 海外`，以及注册时实名相关表述。

| 命中 | 判定 | 理由 |
| --- | --- | --- |
| **#7 第 50 行 `注册（含实名、大区）`** | **改** | **唯一的真旧词**，两个概念都错。改成 `注册（用户名+密码）、登录` |
| #7 第 11、13 行 | 保留 | 正面陈述新决策，且显式标注「大区已整个删掉」并链到 ADR-0011 |
| #7 第 62、85、106 行的「注册」 | 保留 | 流程口语词（注册→浏览→抢购），不是「注册时实名」 |
| #2 第 430 行「库存不按地域切分见 ADR-0011」 | 保留 | 指向 ADR 的结论引用，不是在使用该概念 |
| **#2 第 1 行 `docs/specs/0001` 链接** | **改** | 该文件已在 `54c42a6`（PR #8）移出仓库，**死链**。见 [issue-3-review](issue-3-review.md) 的过时表 |
| [ADR-0009](../adr/0009-real-name-at-purchase.md):16、[ADR-0011](../adr/0011-no-regional-stock.md) 全篇 | 保留 | 前者是墓碑（「早期设计里还要求选一个大区，已删」），后者就是否定该概念的 ADR 本体 |
| 两张模型图 `docs/images/*.svg` | 无命中 | 逐节点提取过文本，无 `大区`/`region` |
| Redis 键（#2:185-191）、`t_allocation`（#2:135）、`V1__init.sql` | 无命中 | 键名不带地域后缀，与 ADR-0011:18 一致；`V1__init.sql` 只是占位注释，**没有表结构** |
| `GLOSSARY.md`、后端代码、前端代码 | 无「大区」 | 实名相关命中全部是「抢购前实名」语义；`web/src/stores/auth.ts:57` 的 `needRealName()` 正确 |
| **`GLOSSARY.md` 未收「大区」为排除词** | **补** | 19 条 `_Avoid_` 里没有它，`check-glossary.sh` **永远扫不到**。见 [guardrails](guardrails.md) |
| `docs/wiki/*`（本层） | 保留 | 其中「大区」均为复核记录与墓碑引用 |

**2026-11-16 补充**：上面那句「术语检查是 advisory，机器不会拦」**说轻了**——同轮护栏 worker 发现提取逻辑本身在 C locale 下会损坏多字节字符，且「大区」压根不在排除词表里。**机器不是不拦，是既拦不住也扫不对**，证据见 [guardrails](guardrails.md)。机器兜底的方案已提为 **issue #27**（扩到 issue 正文），仍 `needs-triage`。**2026-11-16 补充**：修脚本本身另立 **issue #29**，#27 blocked by #29。

## 本次会话新发现

- **2026-11-16**：`Agent` 工具的 subagent 类型在本 runtime 全部不可用，改用 `create_chat_session` 委派。细节见 [environment](environment.md)。待判断：是恢复 `Agent` 类型，还是把 chat-session 委派定为标准路径。
- **2026-11-16**：wiki 落在 `docs/wiki/`（用户选定）。`main` 有分支保护，所以每次 ingest 都要搭车开 PR。约定：wiki 更新尽量搭当次工作的 PR，不为几行记忆单开 PR。
- **2026-11-16**：`docs/wiki/` 曾是 untracked，换机器就没了。**同日已随 `docs/wiki-bootstrap` 分支提交入库**，并在 `AGENTS.md` 的「项目文档」加了指针，新会话才找得到这一层。

  **2026-11-16 补充（commit / PR 号）**：入库 commit 是 **`23f89d9`**（`docs: 建立跨会话 wiki，记下环境暗坑与未结的环`，9 文件 583 行，含 `AGENTS.md:16` 那行指针），承载它的是 **PR #26**（`docs/wiki-bootstrap` → `main`，复核时 **OPEN，未合并**）。按 [workflow](workflow.md) 的「PR 开完即止」，**合并等 owner**。
- **2026-11-16 复核**：**`~/.m2/toolchains.xml` 是机器本地前提，没有提交进仓库**，仓库里也没有任何文件说明要建它。本机有（Nov 15 19:07），CI 不需要它且是绿的，但**换一台机器 toolchain 会失败且报错不指向原因**。待判断：是提交一份 `toolchains.xml` 模板，还是在 README 里写清这一步。细节见 [environment](environment.md)。

- **2026-11-16**：[contract-gaps](contract-gaps.md) 已从「缺口清单」升级为**可决策页**：五态推导表（逐态标 spec 有据 / 推断）、每处缺口的具体改法与代价、两条 ADR 护栏（**不得给 `status` 加 `SOLD_OUT`**，ADR-0003:13；**`allocation` 不得无条件 required**，ADR-0004）、共享逻辑过期缓存导致售罄数字滞后约 2 秒、以及新增错误码时 `ErrorCodeContractTest` 的 blocking 耦合。同日新增 [issue-3-review](issue-3-review.md)。**两页都只读复核产出，没有改契约、没有改 issue。**

## 已结

- **2026-11-16 10:35 UTC**：PR #25（认证决策同步回 spec）**已合并**为 `c5b5508`。交接记录里写的「待用户合并」已过时——交接写于合并前几分钟。教训：交接记录里的 PR 状态要用 `gh` 复核，别直接信。

- **2026-11-16：两个契约决策已拍板（原「待 owner 拍板」节移入此处）。** 结论是 D1 / D2 / D3，见 [decisions-2026-11-16](decisions-2026-11-16.md)。原文保留如下，标 superseded：

  > **（superseded，2026-11-16 挂起时的原文）**「第五态已拍板为失格/冷却。另两个问题问出去时被中断，原因是提问直接用了 spec 术语（见 [workflow](workflow.md) 的沟通教训）。已改为先白话解释，等 owner 回应，不再用选项框追问。
  >
  > 1. **FLASH 抢购每人能买几件？** 决定点击前的已购态字段用 `purchased: boolean` 还是 `remainingQuota: integer`。现有 Lua 第一行是 `EXISTS limitKey`，只能表达「买过/没买过」，所以恒 1 件时现有设计刚好够；可多件则限购键与唯一索引都要改成计数，即 #3 P0-9。
  > 2. **「永久失格」这一档首版做不做？** 做就必须配人工解封入口——ADR-0002 已否掉申诉通道，否则误伤不可恢复。备选：把永久档改成长冷却（如 7 天），但要改 #2:196 与 ADR-0002。
  >
  > 这两条不定，[contract-gaps](contract-gaps.md) 的缺口 3 与第五态就落不了地。」

  **结果**：问题 1 → **D1，可多件，用 `remainingQuota`**；问题 2 → **D2，永久档取消，改 7 天冷却**（走了原文的「备选」，但备选写的是「如 7 天」，owner 定的就是 7 天）。第五态 → **D3 确认**。

  **原文里有个编号错误，一并更正**：末句的「缺口 3」应为 **[contract-gaps](contract-gaps.md) 的缺口 2**（点击前拿不到已购/限购态）。缺口 3 是 `allocation` 非必填。**这个错号在派活指令里也被沿用了一次**，两处都按缺口 2 读。

  **过程教训已落进 [workflow](workflow.md)**：用白话解释再提问，owner 才答得下去；这一轮三个决策就是这么拿到的。