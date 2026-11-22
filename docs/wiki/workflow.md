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

**2026-11-18 补充：** 代理可以给 issue 或 PR 打仓库已有标签；标签、评审结论、CI 全绿都不等于合并授权。合并必须得到 owner 对具体 PR 的明确同意。

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

## 读别的 worker 的分支时，必须记下当时的 commit SHA

**2026-11-16 用户明确要求，本轮真实踩过。**

并行 worker 各自在自己的分支上推进。协调者读对方分支时，若只写「PR #30 里 ADR-0013:31 写着 X」而不记 SHA，**对方后续提交会让这条断言静默过时**，而 wiki 读起来仍然振振有词。

**本轮实例**：读 PR #30 时头是 **`083af8c`**，ADR-0013:31 确实写「待定：冷却的作用域 owner 未拍板」，wiki 据此记了一条「需 worker 回去更新」的待办。**随后 worker 提交 `e107847` 把 D4 写完了**——那条待办变成假的，但 wiki 不会自己知道。**是 owner 拿原文核实才发现的。**

**做法**：

- 引用另一个分支的内容，**行号后面必须带 SHA**，例如 `ADR-0013:31（083af8c）`。
- 断言写成「**截至 `<SHA>`**，X 成立」，不要写成裸的「X 成立」。
- 复核前**先 `git fetch` 再比对头 SHA**，别假设上一轮读到的还是最新。
- **行号会随对方编辑位移，SHA 与行号必须成对记**；只记行号等于没记。本轮 ADR-0013 从 `083af8c` 到 `e107847` 就位移了 2 行，旧 `:29` 变成 `:31`。

**同类风险：issue 正文没有 SHA。** 本轮 issue #2 被 worker 从 **436 行重写成 465 行**，wiki 里所有 `#2:NNN` 一次性过时。**issue 只能用「复核日期 + 总行数」当版本指纹**，换算表见 [contract-gaps](contract-gaps.md) 顶部。

这与上一条「改 issue 正文必须贴 before/after」是同一个结构性问题的两面：**跨边界的改动不在你的 diff 里，所以你看不见它什么时候变了。** 一条靠人工贴证据，一条靠人工记版本号，**在机器兜底（#27 / #29）落地之前都省不掉**。

## 基线落后时把 main 合进来，不要绕过去

**2026-11-16 用户明确指出的更好解法。**

**症状**：wiki 里指向 `docs/adr/0012-*.md` 的相对链接在本分支点不开，因为分支基线（`c5b5508`）早于那两个文件进 main（`742ef1e`）。

**上一轮选的下策**：保留链接 + 加一段「合并进 main 后就正常」的注释。**这是把可验证的事实降级成推测**——链接到底能不能解析，只能等合并后才知道。

**正确解法**：

```
git fetch origin
git merge origin/main
```

**这是普通合并提交，不是 rebase、不是 force-push，不在禁止之列。** 上一轮把「不 rebase」误读成「不能动基线」，所以选了注释那条路。**禁止的是改写已推送的历史，不是禁止把上游合进来。**

**收益**（本轮实测，合并提交 `1b99c93`，无冲突）：

- 相对链接**当场可验证**，不用推测。10 页链接检查零断链、零孤儿。
- 引用的 `path:line` **能就地开文件核**，不必 `git show origin/main:...` 或跳到另一个 worktree。
- PR 合并时不会有意外。

**前提与边界**：

- **合并前先确认工作树干净**（`git status --short` 为空），并**先用 `git merge-tree --write-tree HEAD origin/main` 预演**，退出 0 且只输出一个 tree OID 就是无冲突。
- **两边改动文件不重叠时才敢直接合**。本轮 wiki 分支只动 `docs/wiki/` 与 `AGENTS.md`，main 动 `docs/adr/`、`GLOSSARY.md`、`ci.yml`、`mvnw`、`pom.xml`、`web` 配置。
- **若有冲突，停下来报告，不要自己猜着解。**
- 合并带入的 main 文件**不算自己改的**，提交时只 `git add docs/wiki/`。

## 提交前跑的检查

**2026-11-16 交接记录**：

- 后端 `mvn verify`（先设 `JAVA_HOME`，见 [environment](environment.md)）
- ~~前端 `pnpm test && pnpm build && pnpm lint`~~（superseded，见下方 2026-11-22 更新）
- 文档 `node scripts/check-doc-links.mjs`（**2026-11-17，`b987a6f`，PR #33**）：~~扫 `docs/**/*.md`、`AGENTS.md`、`GLOSSARY.md`、`CODING_STANDARDS/` 的相对链接与 `docs/wiki/` 孤儿页~~（扫描范围已扩展，superseded，见下方 2026-11-22 更新），**命中即红（blocking）**；扫描范围与有意不查项见 [guardrails](guardrails.md)。

> **2026-11-22 更新（Issue #81）**：前端本地校验统一收口为 **`pnpm --dir web check`**（依次执行 `tsc --noEmit`、`eslint .`、`ui:check`、`vitest run`、`vite build`）；`scripts/check-doc-links.mjs` 扫描范围扩展至顶层模块根文档 `*/AGENTS.md` 与 `*/DESIGN.md`（覆盖 `web/AGENTS.md` 与 `web/DESIGN.md`）；`ci.yml` 各步骤行号同步位移，见 [guardrails](guardrails.md)。

> **2026-11-16 更新（`3701bd4`，PR #28）**：后端现在可以用 **`./mvnw verify`**——wrapper 已提交（`mvnw` / `.mvn/wrapper/maven-wrapper.properties`，Maven 3.9.16，`only-script`），不必依赖本机装的 `mvn`。**但 `JAVA_HOME` 仍要手动 export 到 JDK 25**：enforcer 门槛已从 `[21,)` 提到 **`[25,)`**（`pom.xml:128`），**不 export 会在最开始就被拦下**，不再只是 toolchain 阶段失败。wrapper 解决的是 Maven 版本，不是 JDK 版本。

**2026-11-16 复核**：这两条命令**都不覆盖术语检查**。CI 里那一步（`ci.yml:95`）是 advisory，`scripts/check-glossary.sh:97` 恒 `exit 0`。所以上面「全仓搜旧词」那条纪律**只能靠人跑脚本 + 逐条判断**，跑绿了不代表旧词清干净了。各检查拦不拦见 [guardrails](guardrails.md)。

> **2026-11-17 更正（`b987a6f`，PR #33）**：上条引的 `ci.yml:95` 是旧号，术语检查步骤现位移到 `ci.yml:99-100`；同期新增的链接检查 `ci.yml:94-95`（`check-doc-links.mjs`）是 **blocking**，与术语 advisory 不是一类。术语脚本仍恒 `exit 0`，结论不变。

## 评审前先读规范

`AGENTS.md`：评审任何 diff 之前先读对应技术栈的规范——后端 `CODING_STANDARDS/java.md`，前端 `CODING_STANDARDS/typescript.md`，两边都动过就读两份。

那两份里全是机器判不了的判断题，能交给 CI 的一条都不在里面。不读它们，评审只能凭印象。

## PR 标 Ready 前的收口检查

**2026-11-22 追加（源自 #68 / PR #77 复盘，Issue #81）**：

- **PR 从 Draft 标 Ready（或请求 owner 合并）前，必须先跑一遍双轴 `/code-review`**：只跑单测与多轮视觉检查仍可能漏过领域约束（例如 PR #77 曾险些带出违反 ADR-0014 的 `silhouette.ts` 与未同步源 Issue）。收口时必须对 `origin/main...HEAD` 跑双轴 review（`Standards` 轴对照 `CODING_STANDARDS/`、`Spec` 轴对照源 Issue 与设计基线），修完发现的问题并重跑校验绿灯后，才将 PR 标为 `Ready for review` 或交由 owner 合并。
- **交互/视觉迭代改动了原 Issue 范围或文案时同步回写源 Issue**：多轮打磨改变布局、范围或文案后，同步修订对应源 Issue 正文留痕；若改动了 `#2`、`#7` 等规格/实施计划类 Issue 正文，仍按上文「改 issue 正文必须把 before/after 贴进 PR 正文」要求，将每处 `before/after` 贴进 PR 正文 Evidence 段。

## PR 描述格式

`docs/agents/pull-requests.md`：三段模板——Summary 给图或树，Evidence 给 before/after，Merge Danger 标单向门还是双向门。

## 定期文档与术语语义巡检（跨工具入口）

**2026-11-22 补充（`main` = `1230dfb`，规格见 `#60` 及同日更新评论）**：

- **触发节奏**：每 3 天一次（例如 `09:30 Asia/Shanghai`，cron `30 9 */3 * *`），或在开发开工前由任意支持 `git` 与 `gh` CLI 的工具手动执行一次。本机定时配置独立于仓库，换工具或换机器时按下方口令重建即可。
- **看板定位**：原 `#62` 因早期正文过长已于 2026-11-22 关闭归档。每次运行按标题 `docs: 文档同步待人工判断` 动态查找当前 `OPEN` 状态的滚动 issue；若找不到或上次水线之后无新候选与提交，输出 `no-op` 退出。
- **硬约束**：先 `git fetch origin main` 并基于 `origin/main` 核查，绝不在主工作区直接改文件；确有把握的 `docs/wiki/` 更正（每次 `<= 5` 文件、`<= 200` 行，遵循 [index](index.md) Rule 3）通过 `./scripts/new-worktree.sh docs/semantic-<YYYYMMDD> ../sunshine-hub-semantic origin/main --no-link` 另开工作树，跑通 `node scripts/check-doc-links.mjs` 与 `node --test scripts/*.test.mjs` 后提 `docs:` PR，并移除临时工作树。不直接改 `docs/adr/` 正文、`GLOSSARY.md` 定义或源码（仅在 PR 正文给建议），不自动合并、不直推 `main`、不删远端分支、不改既有 issue/PR 正文。
- **可复制执行口令**（跨工具通用）：

```text
在 sunshine-hub 仓库按 issue #60（含 2026-11-22 更新评论）执行一次文档与术语语义巡检：先 git fetch origin main，再按标题查找当前 OPEN 的 `docs: 文档同步待人工判断` 滚动 issue（若无或上次 `<!-- docs-semantic-review: ... -->` 水线后无新候选与提交则输出 no-op 退出）。对照 origin/main 跑 `node scripts/check-doc-links.mjs`、`node --test scripts/*.test.mjs` 与 `./scripts/check-glossary.sh`，结合近期已合 PR 与 open issue 区分真实过时与有意保留的历史墓碑；有把握的 `docs/wiki/` 更正（遵循 docs/wiki/index.md Rule 3，<=5 文件 <=200 行）从 `origin/main` 另开 `--no-link` worktree 提待审 PR 并清理 worktree；拿不准或需改 ADR/GLOSSARY/源码的项只追加到滚动 issue 评论并在末尾写 `<!-- docs-semantic-review: <ISO-8601> main=<sha> -->` 水线。严禁自动合并或直推 main。
```
