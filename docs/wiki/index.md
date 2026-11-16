# Sunshine-FPS wiki

**新会话先读这一页。** 这里是跨会话记忆的入口，不是文档副本——规格在 GitHub Issues，结论在 `docs/adr/`，这一层只记「agents 需要知道但仓库别处没写」的东西。

快照：**2026-11-16**，分支 `docs/wiki-bootstrap`，`main` = `c5b5508`（PR #25 已合并）。

## 约定

| 页 | 一句话 |
| --- | --- |
| [workflow](workflow.md) | 用户明确要求过的做法：subagent + 每 ticket 一个 worktree、PR 开完即止不自己合并、改概念全仓搜旧词、评审前先读 `CODING_STANDARDS/` |
| [decisions](decisions.md) | 11 份 ADR 的**指针页**（标题即结论），加模块边界与依赖方向 `trade → catalog`；不复制结论正文 |

## 环境与护栏

| 页 | 一句话 |
| --- | --- |
| [environment](environment.md) | 工具链的坑：enforcer 门 21+ 而非 25、`~/.m2/toolchains.xml` 是未提交的机器本地前提、无 mvnw、`JAVA_HOME` 需手动 export、pnpm 12 的 `allowBuilds`、版本只钉在 CI |
| [guardrails](guardrails.md) | CI 三个 job 与 `scripts/` 逐条清单，**重点是哪条 blocking 哪条 advisory**（术语检查恒 `exit 0`）、ArchUnit 静默失效的兜底、`new-worktree.sh` 的并行陷阱 |

## 进展

| 页 | 一句话 |
| --- | --- |
| [stages](stages.md) | 四个阶段的真实范围（issue #7 为准）、阶段 1 的**七个**区域、阶段 2 的十步依赖序与 1–5 最小闭环、ticket 拆分状态、三个 open issue |

## 待办与阻塞

| 页 | 一句话 |
| --- | --- |
| [contract-gaps](contract-gaps.md) | **阶段 1 抢购页的前置**：五处契约缺口，四处要改 `api/openapi.yaml`，一处是「五种禁用态」没有权威清单 |
| [open-loops](open-loops.md) | 等着谁、卡在哪：阶段选择未拍板、#3 待 triage、issue #7 的「大区」旧词未清、阶段 1/2 未拆 ticket、wiki 自身尚未提交 |

## 本页

| 页 | 一句话 |
| --- | --- |
| [index](index.md) | 你正在读的这页，全部 wiki 页的目录 |

## 建议阅读顺序

**要动手写代码**：[workflow](workflow.md) → [environment](environment.md) → [guardrails](guardrails.md) → [stages](stages.md) → 对应模块的 [decisions](decisions.md) 条目。

**要做抢购页**：先读 [contract-gaps](contract-gaps.md)，**它列的缺口不补，页面写出来就是错的**。

**要接手协调**：[open-loops](open-loops.md) → [stages](stages.md) → [workflow](workflow.md)。

## 写这一层的规矩

1. **中文，紧散文，指针优于正文。** 能写 `path:line` / issue 号 / commit SHA 就不写一段描述。
2. **这是历史记录，每条断言都带日期或 commit。** 不要脱离日期写「目前 / 现在 / 是」——代码会变，不带日期的断言下个月就是错的。
3. **新发现与旧断言冲突时，加一条带日期的更正并标旧断言 superseded，不要静默改写。** 删掉旧断言就看不出这件事曾经被误判过。已经这么做的例子：[environment](environment.md) 的 enforcer 阈值、[stages](stages.md) 的「八个区域」与契约规模、[decisions](decisions.md) 的 `main` SHA。
4. **来源（交接记录、issue、PR、侦察报告）是引用的，不是整段搬进来的。**
5. **页页互链，不留孤儿页。** 新增页要回到这一页登记。

## 权威来源在哪

- **规格**：issue **#2**（`ready-for-agent`）
- **实施路径与阶段**：issue **#7**（`docs`）
- **架构结论**：`docs/adr/0001`–`0011`
- **领域术语与排除词**：`GLOSSARY.md`
- **改动纪律 / 评审规范**：`AGENTS.md`、`CODING_STANDARDS/java.md`、`CODING_STANDARDS/typescript.md`
- **agent 操作约定**：`docs/agents/*.md`

wiki 与这些冲突时，**以这些为准，并回来给 wiki 加更正**。