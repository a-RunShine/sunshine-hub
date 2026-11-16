# Sunshine-FPS wiki

**新会话先读这一页。** 这里是跨会话记忆的入口，不是文档副本——规格在 GitHub Issues，结论在 `docs/adr/`，这一层只记「agents 需要知道但仓库别处没写」的东西。

快照：**2026-11-16**，分支 `docs/wiki-bootstrap`，`main` = `c5b5508`（PR #25 已合并）。本层入库于 **`23f89d9`**，由 **PR #26** 承载（复核时 OPEN，**未合并**，合并等 owner）；本次更新前的分支头是 `97d81cf`。**共 10 页。**

## 约定

| 页 | 一句话 |
| --- | --- |
| [workflow](workflow.md) | 用户明确要求过的做法：subagent + 每 ticket 一个 worktree、PR 开完即止不自己合并、改概念全仓搜旧词、**改 issue 正文必须把 before/after 贴进 PR 正文**、**提问用中文白话不拿 spec 术语砸人**、评审前先读 `CODING_STANDARDS/` |
| [decisions](decisions.md) | 11 份 ADR 的**指针页**（标题即结论），加模块边界与依赖方向 `trade → catalog`；不复制结论正文。**0002 / 0010 正在被修订，标题会变** |
| [decisions-2026-11-16](decisions-2026-11-16.md) | **变更的历史记录，不是指针页**：owner 拍板的 D1（限购可配置、每场独立额度）/ D2（取消永久失格改两档冷却）/ D3（第五态＝失格冷却），逐条**推翻了什么、保留了什么**、单向门代价、下游修订清单、仍未定项 |

## 环境与护栏

| 页 | 一句话 |
| --- | --- |
| [environment](environment.md) | 工具链的坑：enforcer 门 21+ 而非 25、`~/.m2/toolchains.xml` 是未提交的机器本地前提、无 mvnw、`JAVA_HOME` 需手动 export、**`LANG`/`LC_CTYPE` 未设置导致中文 shell 工具按字节处理**、pnpm 12 的 `allowBuilds`、版本只钉在 CI |
| [guardrails](guardrails.md) | CI 三个 job 与 `scripts/` 逐条清单，**重点是哪条 blocking 哪条 advisory**；术语检查不只 advisory，**提取本身在 C locale 下损坏、且 `GLOSSARY.md` 未收「大区」**；错误码双份同步是 blocking；ArchUnit 静默失效的兜底、`new-worktree.sh` 的并行陷阱 |

## 进展

| 页 | 一句话 |
| --- | --- |
| [stages](stages.md) | 四个阶段的真实范围（issue #7 为准）、阶段 1 的**七个**区域、阶段 2 的十步依赖序与 1–5 最小闭环、ticket 拆分状态、三个 open issue |

## 待办与阻塞

| 页 | 一句话 |
| --- | --- |
| [contract-gaps](contract-gaps.md) | **阶段 1 抢购页的前置，可决策页**：五态**已定清单**（未实名/未登录**不是**禁用态）、缺口 2 字段定为 `remainingQuota`、两条 ADR 护栏（不得给 `status` 加 `SOLD_OUT`、`allocation` 不得无条件 required）、共享缓存导致售罄滞后约 2 秒、拍板状态（三条已定、拆分方式仍未定） |
| [issue-3-review](issue-3-review.md) | #3 九条 P0 的分类 + **D1/D2 之后的状态变化**：**P0-9 已触发必修**、**P0-7 部分已解**、**P0-2 可能变重需重评**；哪些相邻不重叠、哪些无关；**#3 自己四处已过时** |
| [open-loops](open-loops.md) | 等着谁、卡在哪：**限购键改名是单向门**、**唯一索引机制待换（P0-9）**、**P0-2 待重评**、`miss` 的 scope 与清零规则没拍、#3/#27/#29 待 triage、#7 的「大区」旧词未清（附**逐条判定表**）、阶段 1/2 未拆 ticket |

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
- **文档与决策审查**：issue **#3**（`needs-triage` + `docs`）——**引用它时带上 [issue-3-review](issue-3-review.md) 的四处更正**，它写于 ADR 只有 7 份的时候
- **架构结论**：`docs/adr/0001`–`0011`。**2026-11-16 例外**：0002:16 与 0010:5 已被 owner 推翻（D1），但 ADR 文本尚未修订（派给 `docs/limit-cooldown-decisions`）。**这段窗口期里 [decisions-2026-11-16](decisions-2026-11-16.md) 比 ADR 旧文本新**——别按下面那条通则把 wiki「更正」回旧结论。ADR 修订合并后此例外失效。
- **领域术语与排除词**：`GLOSSARY.md`
- **改动纪律 / 评审规范**：`AGENTS.md`、`CODING_STANDARDS/java.md`、`CODING_STANDARDS/typescript.md`
- **agent 操作约定**：`docs/agents/*.md`

wiki 与这些冲突时，**以这些为准，并回来给 wiki 加更正**。