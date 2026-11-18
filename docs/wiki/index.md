# Sunshine-FPS wiki

**新会话先读这一页。** 这里是跨会话记忆的入口，不是文档副本——规格在 GitHub Issues，结论在 `docs/adr/`，这一层只记「agents 需要知道但仓库别处没写」的东西。

> 本页只做目录：各页讲什么、什么时候读。**当前阶段见 [stages](stages.md)**，**未决项与阻塞见 [open-loops](open-loops.md)**——当前态不在本页维护。

## 约定

| 页 | 一句话 |
| --- | --- |
| [workflow](workflow.md) | 用户明确要求过的工作方式：subagent 委派、每 ticket 一个 worktree、PR 开完即止不自己合并、改概念全仓搜旧词、改 issue 正文必须把 before/after 贴进 PR 正文、读别的 worker 的分支先记 commit SHA、提问用中文白话不拿 spec 术语砸人；评审 diff 前先读对应 `CODING_STANDARDS/`。 |
| [decisions](decisions.md) | ADR 的指针页（标题即结论），另记模块边界与依赖方向（`trade → catalog`）；结论正文在 `docs/adr/`，本页不复制。 |
| [decisions-2026-11-16](decisions-2026-11-16.md) | 2026-11-16 四条决策变更（D1–D4）的历史记录，不是指针页：每条推翻了什么、保留了什么、单向门代价、下游修订清单与仍未定项。 |

## 环境与护栏

| 页 | 一句话 |
| --- | --- |
| [environment](environment.md) | 工具链与本机环境踩过的坑，以及绕开它们的正确姿势，每条都带日期或 commit；遇到构建、JDK、locale、包管理器类问题先翻这页。 |
| [guardrails](guardrails.md) | CI 各 job 与 `scripts/` 护栏逐条清单，重点标清哪条 blocking、哪条 advisory，以及静默失效兜底与并行陷阱；改 CI 或脚本前先读。 |

## 进展

| 页 | 一句话 |
| --- | --- |
| [stages](stages.md) | 实施阶段划分与各阶段范围（以 issue #7 为准）：区域清单、依赖序与最小闭环、ticket 拆分情况；当前进度见本页。 |

## 待办与阻塞

| 页 | 一句话 |
| --- | --- |
| [contract-gaps](contract-gaps.md) | 抢购页的前置可决策页：契约缺口、每处改法与代价、撞哪两条 ADR；动手写抢购页之前先读。issue #2 的行号换算表在该页顶部，引用行号前先查。 |
| [issue-3-review](issue-3-review.md) | issue #3 九条 P0 的分类、与契约缺口的重叠关系、#3 自身的过时处；引用 #3 之前先读这页的更正。 |
| [open-loops](open-loops.md) | 等着谁、卡在哪：未决项、阻塞与等待关系；接手协调或开工前先读，看哪些事还没结。 |

## 本页

| 页 | 一句话 |
| --- | --- |
| [index](index.md) | 你正在读的这页，全部 wiki 页的目录。 |

## 建议阅读顺序

**要动手写代码**：[workflow](workflow.md) → [environment](environment.md) → [guardrails](guardrails.md) → [stages](stages.md) → 对应模块的 [decisions](decisions.md) 条目。

**要补契约**：[decisions-2026-11-16](decisions-2026-11-16.md) → [issue-3-review](issue-3-review.md) → [contract-gaps](contract-gaps.md)。先读决策页，否则会把已被决策取代的旧结论当成现行；再读 #3 那页的审查分类。

**要做抢购页**：先读 [contract-gaps](contract-gaps.md)，它列的缺口不补，页面写出来就是错的。

**要接手协调**：[open-loops](open-loops.md) → [issue-3-review](issue-3-review.md) → [stages](stages.md) → [workflow](workflow.md)。

## 写这一层的规矩

1. **中文，紧散文，指针优于正文。** 能写 `path:line` / issue 号 / commit SHA 就不写一段描述。
2. **这是历史记录，每条断言都带日期或 commit。** 不要脱离日期写「目前 / 现在 / 是」——代码会变，不带日期的断言下个月就是错的。
3. **新发现与旧断言冲突时，加一条带日期的更正并标旧断言 superseded，不要静默改写。** 删掉旧断言就看不出这件事曾经被误判过。已经这么做的例子：[environment](environment.md) 的 enforcer 阈值、[stages](stages.md) 的区域数与契约规模、[decisions](decisions.md) 的 `main` SHA。
4. **来源（交接记录、issue、PR、侦察报告）是引用的，不是整段搬进来的。**
5. **页页互链，不留孤儿页。** 新增页要回到这一页登记。

## 权威来源在哪

- **规格**：issue **#2**
- **实施路径与阶段**：issue **#7**
- **文档与决策审查**：issue **#3**——引用它时先读 [issue-3-review](issue-3-review.md) 的更正
- **架构结论**：`docs/adr/`，标题索引见 [decisions](decisions.md)

- **引用行号前先查版本基准**：issue **#2** 的 `#2:NNN` 换算表在 [contract-gaps](contract-gaps.md) 顶部；ADR 与 `GLOSSARY.md` 的位移基准说明在 [decisions-2026-11-16](decisions-2026-11-16.md) 顶部。**读别的 worker 的分支必须记 SHA**，见 [workflow](workflow.md)。
- **领域术语与排除词**：`GLOSSARY.md`
- **改动纪律 / 评审规范**：`AGENTS.md`、`CODING_STANDARDS/java.md`、`CODING_STANDARDS/typescript.md`
- **agent 操作约定**：`docs/agents/*.md`

wiki 与这些冲突时，**以这些为准，并回来给 wiki 加更正**。
