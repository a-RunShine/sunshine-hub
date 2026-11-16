# 未结的环

等着谁、卡在哪。结掉的就移到下面「已结」并留日期，不要删——删了就看不出这件事曾经卡过。

相关页：[index](index.md) · [stages](stages.md) · [contract-gaps](contract-gaps.md) · [guardrails](guardrails.md) · [environment](environment.md)

## 已拍板（2026-11-16）

- **2026-11-16**：阶段 0 完成后做阶段 1 还是阶段 2 —— **用户已拍板：先补契约，再开阶段 1 抢购页**。理由见 [contract-gaps](contract-gaps.md)：契约是阶段 1 与 2 的唯一硬依赖，不补两边都会照着不足的契约往下写。
- **2026-11-16**：是否先做环境护栏修补 —— **用户已拍板：先修一轮护栏**。范围与进展见 [guardrails](guardrails.md)，在 worktree `../sunshine-hub-guardrails`、分支 `chore/guardrails` 上进行。
- 两条并行推进：护栏改 `ci.yml`/`scripts/`/`pom.xml`/`web` 配置，契约改 `api/openapi.yaml` 与 issue 正文，互不重叠。

## 等 triage

- **2026-11-16 复核**：**issue #3「文档与决策审查：P0 九处模型硬伤，P1 十处规格缺口」** 挂着 `needs-triage` + `docs`，**还没人评估**。标题自称有九处 P0 模型硬伤——**在阶段 1/2 开工前值得先读一遍**，否则可能照着有硬伤的模型实现。本次侦察没有逐条核实那九处，只确认了 issue 状态与标签。

## 已知但未做（环境护栏）

来自 **2026-11-16 交接记录**，属于「有偏差先修，再做功能」那一类：

- **`actions/setup-java@v4` 已废弃**，建议升 v5，CI 日志里有提示。
- **术语检查脚本只输出候选不 fail**，CI 里能看到但不会拦人。等于 [workflow](workflow.md) 的全仓搜旧词纪律没有机器兜底。
- **阶段 1 的 MSW handler 只有骨架用的几条**，页面实现时要按契约补齐。

**2026-11-16 复核：三条全部确认仍然存在**（`c5b5508`）。逐条证据与「拦不拦」的判定见 [guardrails](guardrails.md)：`ci.yml:15` 仍是 `setup-java@v4`；`scripts/check-glossary.sh:97` 是 `exit 0`；`web/src/mocks/handlers.ts` 只有 7 个 handler，且 claim handler（`:109-119`）**无条件返回 201，造不出任何失败态**。

## 契约缺口阻塞抢购页

- **2026-11-16 复核**：**[contract-gaps](contract-gaps.md) 是阶段 1 抢购页的前置，不是它的实现细节。** 五处缺口里四处要改 `api/openapi.yaml`（编号池异常无 5xx 出口、点击前拿不到已购/限购态、`allocation` 非必填、匿名接口返回用户专属 `reserved`），第五处是「五种按钮禁用态」根本没有权威清单。

  按 issue #7 的依赖图，契约是阶段 1 与阶段 2 的**唯一硬依赖**，所以这几处不补，**两个阶段都会照着不足的契约往下写**。

  这件事同时验证了交接记录「早做抢购页能暴露契约缺口」的判断——缺口在写代码之前就浮出来了。

## 阶段 1/2 还没拆 ticket

- **2026-11-16 复核**：**阶段 1 与阶段 2 各自仍是 #7 里的一个大段落，没有 per-ticket 子 issue。** 只有阶段 0 拆过（#11 + #14–#18 + 评审修复 #20–#24，全部 CLOSED）。

  [workflow](workflow.md) 的约定是「每个 ticket 一个 worktree，派 subagent 实现」——**没有 ticket 就没有 worktree 的边界**，这条约定现在无从执行。实现前必须先拆。

- **2026-11-16 复核**：**`module:*` 标签一个都还没建**（现有 6 个标签里没有）。`AGENTS.md` 说「第一个模块落地时按模块名创建，此后每个 issue 至少带一个」，拆 ticket 时要一并建，按模块边界拆。详见 [stages](stages.md)。

## 概念改了一半：issue #7 的「大区」

- **2026-11-16 复核**：**issue #7 第 50 行仍写着 `| 身份 | 注册（含实名、大区）、登录 |`**，与它自己的第 11 行（「实名不在注册时填」「注册只要用户名和密码」）和第 13 行（「早期设计里的『大区』已经整个删掉」）**直接矛盾**，也违反 [ADR-0009](../adr/0009-real-name-at-purchase.md) 与 [ADR-0011](../adr/0011-no-regional-stock.md)。

  **PR #25 的 issue 同步是不完整的。** 它的 commit message（`38d2eee`）声称「issue #7 的三处改成指向 ADR-0008 / 0009 / 0011 的完整链接」——前置段落那几处确实改了（第 11、13 行现在带完整链接），**但阶段 1 页面清单那一行漏了**。PR #25 的 diff 只含 `api/openapi.yaml` 与 `docs/adr/0008-session-over-jwt.md`，issue 正文的改动不在 diff 里，**评审看不到，所以漏了也没人拦**。

  这正是 `AGENTS.md` 与 [workflow](workflow.md) 警告的「概念改一半」：两种叫法并存，旧的那半没人维护，**下一个 agent 会照着第 50 行去实现「注册时填实名和大区」**。而 [guardrails](guardrails.md) 说明了术语检查是 advisory，机器不会拦。

  待办：改 issue #7 第 50 行。**本次侦察是只读的，没有动它。**

## 本次会话新发现

- **2026-11-16**：`Agent` 工具的 subagent 类型在本 runtime 全部不可用，改用 `create_chat_session` 委派。细节见 [environment](environment.md)。待判断：是恢复 `Agent` 类型，还是把 chat-session 委派定为标准路径。
- **2026-11-16**：wiki 落在 `docs/wiki/`（用户选定）。`main` 有分支保护，所以每次 ingest 都要搭车开 PR。约定：wiki 更新尽量搭当次工作的 PR，不为几行记忆单开 PR。
- **2026-11-16**：`docs/wiki/` 曾是 untracked，换机器就没了。**同日已随 `docs/wiki-bootstrap` 分支提交入库**，并在 `AGENTS.md` 的「项目文档」加了指针，新会话才找得到这一层。
- **2026-11-16 复核**：**`~/.m2/toolchains.xml` 是机器本地前提，没有提交进仓库**，仓库里也没有任何文件说明要建它。本机有（Nov 15 19:07），CI 不需要它且是绿的，但**换一台机器 toolchain 会失败且报错不指向原因**。待判断：是提交一份 `toolchains.xml` 模板，还是在 README 里写清这一步。细节见 [environment](environment.md)。

## 已结

- **2026-11-16 10:35 UTC**：PR #25（认证决策同步回 spec）**已合并**为 `c5b5508`。交接记录里写的「待用户合并」已过时——交接写于合并前几分钟。教训：交接记录里的 PR 状态要用 `gh` 复核，别直接信。