# 工作方式约定

用户明确要求过的做法。违反这些比写错代码更严重。

相关页：[index](index.md) · [environment](environment.md) · [guardrails](guardrails.md) · [decisions](decisions.md) · [decisions-2026-11-16](decisions-2026-11-16.md) · [open-loops](open-loops.md)

## 沟通：中文，且不要拿 spec 术语直接提问

- **2026-11-16**：用户明确要求「说中文啊」。所有面向用户的文字用中文，包括进度更新与提问选项。
- **2026-11-16 教训**：曾用 `AskUserQuestion` 直接问「FLASH 抢购每人限购是否恒为 1 件」「永久失格进首版吗」，用户反问「什么是 flash 抢购」「什么是永久失格」，随后中断了提问。

  **owner 不必然熟悉 spec 里的术语。** 提问前先用白话解释这个概念是什么、为什么需要他拍板，或者干脆自己去查定义。把术语当共同知识，问题就问不出去。

  正确做法：先给一段白话解释（带 `path:line` 依据），再问决策；或者把决策改写成不含术语的白话选项。

## 用 subagent 干活

**2026-11-16 交接记录**：用户曾因为上一个 agent 全部自己动手而明确批评过。约定是**每个 ticket 一个 worktree**，派 subagent 实现。

协调者（chief-of-staff）自己只做决策、综合、评审，不写实现代码。可用委派路径见 [environment](environment.md)。

**2026-11-16 复核**：让这条约定变便宜的工具是 `scripts/new-worktree.sh`（worktree + `node_modules` 软链，省掉一次 `pnpm install`）。**并行跑两个前端 ticket 必须传 `--no-link`**，否则共享的 `node_modules` 会互相覆盖。用法与理由见 [guardrails](guardrails.md)。

## PR 开完即止

**commit `0cb3a41`（docs: 合并必须经所有者同意）** 起成为仓库纪律，`AGENTS.md` 有明文。

**PR 开完即止，不要自己合并。** 合并必须等仓库所有者明确同意，一个字都别替他省。

`main` 有分支保护，**只能走 PR，不能直接 push**（直接推会报 GH013）。

## 改动涉及领域概念时全仓搜旧词

**commit `d5c24c2`（docs: 增加改动纪律，删改概念要全仓搜旧词）**。`AGENTS.md` 有明文。

删掉或改名一个领域概念时，全仓搜旧词。范围不止代码：模型图、表结构、Redis 键、用户故事、issue 都要过。

`grep -rn` 只能找到一半，判断哪个词算旧词靠人。命中之后逐条过，不是看一眼有没有命中就收工。

概念改一半最要命：两种叫法并存，旧的那半没人维护，下一个 agent 会照着它实现。

## 改 issue 正文必须把 before/after 贴进 PR 正文

**2026-11-16 用户明确要求**，本轮已按此要求派给决策 worker（worktree `../sunshine-hub-decisions`、分支 `docs/limit-cooldown-decisions`）。

**规则**：凡是改了 issue 正文（#2 规格、#7 实施路径等），**必须把每一处改动的 before/after 贴进 PR 正文**，带 issue 号与行号。

**为什么**：**issue 正文的改动不进 PR diff，评审看不到。** 实例就是 PR #25（merge commit `c5b5508`）：它的 commit `38d2eee` 声称把 #7 的三处改成指向 ADR 的完整链接，前置段落确实改了，**但阶段 1 页面清单第 50 行漏了**——`| 身份 | 注册（含实名、大区）、登录 |` 至今还在。PR #25 的 diff 只含 `api/openapi.yaml` 与 `docs/adr/0008-session-over-jwt.md`，**评审无从发现漏改**。

**这是结构性漏洞的人工兜底**：机器那一半是 **issue #27**（把术语检查扩到 issue 正文），仍 `needs-triage`，且 blocked by **#29**（先修仓库内检查）。**在 #27 落地之前，before/after 是唯一能让评审看见 issue 改动的办法。**

与 `docs/agents/pull-requests.md` 的三段模板相容：before/after 就放在 **Evidence** 段。

## 提交前跑的检查

**2026-11-16 交接记录**：

- 后端 `mvn verify`（先设 `JAVA_HOME`，见 [environment](environment.md)）
- 前端 `pnpm test && pnpm build && pnpm lint`

**2026-11-16 复核**：这两条命令**都不覆盖术语检查**。CI 里那一步（`ci.yml:95`）是 advisory，`scripts/check-glossary.sh:97` 恒 `exit 0`。所以上面「全仓搜旧词」那条纪律**只能靠人跑脚本 + 逐条判断**，跑绿了不代表旧词清干净了。各检查拦不拦见 [guardrails](guardrails.md)。

## 评审前先读规范

`AGENTS.md`：评审任何 diff 之前先读对应技术栈的规范——后端 `CODING_STANDARDS/java.md`，前端 `CODING_STANDARDS/typescript.md`，两边都动过就读两份。

那两份里全是机器判不了的判断题，能交给 CI 的一条都不在里面。不读它们，评审只能凭印象。

## PR 描述格式

`docs/agents/pull-requests.md`：三段模板——Summary 给图或树，Evidence 给 before/after，Merge Danger 标单向门还是双向门。