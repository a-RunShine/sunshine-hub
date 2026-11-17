# Sunshine-FPS wiki

**新会话先读这一页。** 这里是跨会话记忆的入口，不是文档副本——规格在 GitHub Issues，结论在 `docs/adr/`，这一层只记「agents 需要知道但仓库别处没写」的东西。

快照：**2026-11-17**，分支 `docs/wiki-ingest-2026-11-17`，**`main` = `b987a6f`**（PR #33 于 02:21:29 UTC 合并，[来源](https://github.com/a-RunShine/sunshine-hub/pull/33)）。**ADR 共 13 份，wiki 共 10 页，均无增减。** PR #26 已于 **2026-11-16 14:32:15 UTC** 合并为 `0c1dec6`（[来源](https://github.com/a-RunShine/sunshine-hub/pull/26)）；Issue #31 已由 PR #33 关闭（[来源](https://github.com/a-RunShine/sunshine-hub/issues/31)）。2026-11-17 复核的 open Issue 是 **#2 / #3 / #7 / #27 / #29 / #32，共 6 个**。

**2026-11-17：文档相对链接与 wiki 孤儿页检查已随 PR #33 进入 `main` 的 contract job，命中即 fail**（`b987a6f`，`scripts/check-doc-links.mjs`）。本轮提交前改为直接运行该仓库检查，不再只靠人工核对。

> **2026-11-17 更正（superseded）**：旧快照写「`main` = `3701bd4`、PR #26 仍 OPEN、只实测人工链接检查」，均已过时。旧文保留如下：
>
> 快照：**2026-11-16**，分支 `docs/wiki-bootstrap`，**`main` = `3701bd4`**（PR #30 → `742ef1e` 12:35:06 UTC、PR #28 → `3701bd4` 12:35:18 UTC，均 squash 合并，两次 CI success）。**ADR 共 13 份**（新增 0012 / 0013）。本层入库于 `23f89d9`，由 **PR #26** 承载，**仍 OPEN、未合并**，合并等 owner。**共 10 页。**
>
> **2026-11-16：`origin/main` 已合进本分支**（普通合并提交 **`1b99c93`**，`git merge origin/main`，**无冲突**，非 rebase / 非 force-push）。**所以本分支现在自带 13 份 ADR、新版 GLOSSARY、mvnw 与护栏改动**，wiki 里的 `path:line` 与相对链接**都能就地核对**。**实测：10 页链接检查零断链、零孤儿页。**
>
> **2026-11-16 更正（superseded）**：本页旧版快照写 `main` = `c5b5508`、ADR 11 份、PR #30 待合。**均已过时**，见上。旧值保留以显示这一天 main 动了两次。

## 约定

| 页 | 一句话 |
| --- | --- |
| [workflow](workflow.md) | 用户明确要求过的做法：subagent + 每 ticket 一个 worktree、PR 开完即止不自己合并、改概念全仓搜旧词、**改 issue 正文必须把 before/after 贴进 PR 正文**、**读别的 worker 的分支必须记下当时的 commit SHA**、**提问用中文白话不拿 spec 术语砸人**、评审前先读 `CODING_STANDARDS/`；**2026-11-17 起提交前检查含 `node scripts/check-doc-links.mjs`（PR #33 / `b987a6f`）** |
| [decisions](decisions.md) | **13 份** ADR 的**指针页**（标题即结论），加模块边界与依赖方向 `trade → catalog`；不复制结论正文。**0012 / 0013 已进 main；0002 / 0010 标题未变但结论被部分取代，原文按设计保留** |
| [decisions-2026-11-16](decisions-2026-11-16.md) | **变更的历史记录，不是指针页**：D1（限购可配置、每场独立额度）/ D2（取消永久失格改两档冷却）/ D3（第五态＝失格冷却）/ D4（冷却跨场生效限本商品，与 D1 有意不对称），逐条**推翻了什么、保留了什么**、单向门代价、下游修订清单（**多数已兑现**）、仍未定项。**四条均已落 main 的 ADR-0012/0013** |

## 环境与护栏

| 页 | 一句话 |
| --- | --- |
| [environment](environment.md) | 工具链的坑，**PR #28 后多条已翻转**：enforcer 现为 **`[25,)`**（曾 `[21,)`）、**已有 mvnw**（曾无）、**已钉 `packageManager` 与 `.nvmrc`**（曾只钉 CI）；仍是坑的：`~/.m2/toolchains.xml` 是未提交的机器本地前提、`JAVA_HOME` 需手动 export（现在 enforcer 会直接拦）、**`LANG`/`LC_CTYPE` 未设置导致中文 shell 工具按字节处理**、pnpm 12 的 `allowBuilds` |
| [guardrails](guardrails.md) | CI 三个 job 与 `scripts/` 逐条清单，**重点是哪条 blocking 哪条 advisory**；**PR #33（`b987a6f`）已把文档相对链接 + wiki 孤儿页检查接成 blocking，并关闭 #31**；`setup-java` 已升 **v5**（其它 action 仍 v4）；**术语检查仍 advisory，#29 新增“豁免机制先于 blocking”与 locale 乱码候选消失的验收信号，#27 仍 blocked by #29**；错误码双份同步是 blocking；ArchUnit 静默失效的兜底、`new-worktree.sh` 的并行陷阱 |

## 进展

| 页 | 一句话 |
| --- | --- |
| [stages](stages.md) | 四个阶段的真实范围（issue #7 为准）、阶段 1 的**七个**区域、阶段 2 的十步依赖序与 1–5 最小闭环、ticket 拆分状态；**2026-11-17 复核为六个 open Issue，#32 已拆为 MSW 失败态前置 ticket，但被尚未开票的契约修订阻塞** |

## 待办与阻塞

| 页 | 一句话 |
| --- | --- |
| [contract-gaps](contract-gaps.md) | **阶段 1 抢购页的前置，可决策页**：**顶部有 #2 行号换算表（spec 已被重写 436→465 行，引用前必查）**、五态**已定清单**（第四态按场重置、第五态按商品跨场，**不对称是有意的**）、缺口 2 字段定为 `remainingQuota`、两条 ADR 护栏、共享缓存导致售罄滞后约 2 秒、**下一个契约 ticket 的九项范围** |
| [issue-3-review](issue-3-review.md) | #3 九条 P0 的分类 + **D1–D4 之后的状态变化**：**P0-9 已触发必修**、**P0-7 部分解决**（`string` 计数键表达不了 24h 滑动窗口、独立冷却键未设计）、**P0-2 可能变重需重评**；**⚠️ #3 的 P0-7 三键改法是施工陷阱，`rate` 与 `ban` 两个键已被推翻，照抄会静默废掉 D1/D2**；**#3 自己五处已过时** |
| [open-loops](open-loops.md) | 等着谁、卡在哪：**契约修订 ticket 待开（九项），#32 的 MSW 失败态工作被它阻塞**、限购键改名是单向门、唯一索引机制待换（P0-9）、P0-2 待重评、**`string` 计数键表达不了 24h 滑动窗口 + 独立冷却键未设计**、**#3 P0-7 改法段待重写**、#3/#27/#29/#32 待 triage、#7 的「大区」旧词未清；**#29 新增豁免机制与 locale 验收信号，#27 仍 blocked by #29**。**PR #26/#28/#30/#33 已结，#31 已由 #33 关闭** |

## 本页

| 页 | 一句话 |
| --- | --- |
| [index](index.md) | 你正在读的这页，全部 wiki 页的目录 |

## 建议阅读顺序

**要动手写代码**：[workflow](workflow.md) → [environment](environment.md) → [guardrails](guardrails.md) → [stages](stages.md) → 对应模块的 [decisions](decisions.md) 条目。

**要补契约**（2026-11-16 起 owner 选定的下一步）：[decisions-2026-11-16](decisions-2026-11-16.md) → [issue-3-review](issue-3-review.md) → [contract-gaps](contract-gaps.md)。**先读决策页**，否则会把已被推翻的「跨场累计」「一人一单」当成现行结论；**再读 #3 那页**，P0-9 现在是硬前置。

**要做抢购页**：先读 [contract-gaps](contract-gaps.md)，**它列的缺口不补，页面写出来就是错的**。

**要接手协调**：[open-loops](open-loops.md) → [issue-3-review](issue-3-review.md) → [stages](stages.md) → [workflow](workflow.md)。

## 写这一层的规矩

1. **中文，紧散文，指针优于正文。** 能写 `path:line` / issue 号 / commit SHA 就不写一段描述。
2. **这是历史记录，每条断言都带日期或 commit。** 不要脱离日期写「目前 / 现在 / 是」——代码会变，不带日期的断言下个月就是错的。
3. **新发现与旧断言冲突时，加一条带日期的更正并标旧断言 superseded，不要静默改写。** 删掉旧断言就看不出这件事曾经被误判过。已经这么做的例子：[environment](environment.md) 的 enforcer 阈值、[stages](stages.md) 的「八个区域」与契约规模、[decisions](decisions.md) 的 `main` SHA。
4. **来源（交接记录、issue、PR、侦察报告）是引用的，不是整段搬进来的。**
5. **页页互链，不留孤儿页。** 新增页要回到这一页登记。

## 权威来源在哪

- **规格**：issue **#2**（`ready-for-agent`）
- **实施路径与阶段**：issue **#7**（`docs`）
- **文档与决策审查**：issue **#3**（`needs-triage` + `docs`）——**引用它时带上 [issue-3-review](issue-3-review.md) 的五处更正**，它写于 ADR 只有 7 份的时候
- **架构结论**：`docs/adr/0001`–**`0013`**（**2026-11-17 基准 `main` = `b987a6f`**；2026-11-16 旧基准 `3701bd4` 已被取代，ADR 总数与内容未因 PR #33 改变）。**2026-11-16：D1–D4 已随 PR #30（`742ef1e`）落到 ADR-0012 / 0013，可直接引用为现行结论。**

  > **2026-11-16 更正（superseded）**：本条旧版写「main 上是 0001–0011」「修订在 PR #30，OPEN 未合并」「**这段窗口期里 wiki 比 main 的 ADR 文本新**，别按通则把 wiki 更正回旧结论」。**该例外已失效**——PR #30 已合并，wiki 与 main 一致，**下面那条「以权威来源为准」的通则恢复无条件生效**。
  >
  > 更早一层更正（同样 superseded）：旧版还写「D4 晚于 PR #30，ADR-0013:31 的作用域未拍板已过时」——那是读了 `083af8c` 而非分支头 `e107847` 所致，worker 当时已写完。教训见 [workflow](workflow.md)。
  >
  > **⚠️ 但 0002 / 0010 要连着顶部取代说明一起读**：它们的标题没变、原文按设计保留（含 `ADR-0002:9` 的「一人一单」墓碑），**结论已被 0012 / 0013 部分取代**。别把保留的原文当现行结论。
- **⚠️ 引用行号前先查版本基准**：issue **#2 已被重写**（436 → 465 行），`#2:NNN` 换算表在 [contract-gaps](contract-gaps.md) 顶部；ADR-0013 与 `GLOSSARY.md` 在 PR #30 里也位移了，基准说明在 [decisions-2026-11-16](decisions-2026-11-16.md) 顶部。**读别的 worker 的分支必须记 SHA**，见 [workflow](workflow.md)。
- **领域术语与排除词**：`GLOSSARY.md`
- **改动纪律 / 评审规范**：`AGENTS.md`、`CODING_STANDARDS/java.md`、`CODING_STANDARDS/typescript.md`
- **agent 操作约定**：`docs/agents/*.md`

wiki 与这些冲突时，**以这些为准，并回来给 wiki 加更正**。