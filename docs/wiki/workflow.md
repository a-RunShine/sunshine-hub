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

## 需求讨论收口后先确认切片路径

**2026-11-24 记**：`/grill-with-docs` 之类把设计树问空之后，agent 很容易直接开写代码，尤其当范围已经扩到契约、后端或跨多页面时。**这一步要停**：先向 owner 说明范围已经跨出单页，建议走 `/to-tickets` 按垂直切片拆票，等确认后再按 `/implement-spec` 推进。跳过切片一口气写完，返工成本落在最贵的地方——契约与多页面联动。

## PR 开完即止

现行纪律见根 `AGENTS.md` `### Pull requests`：**PR 开完即止，禁止擅自合并 / 关闭 / 删远端分支**，标签、评审结论与 CI 全绿都不构成授权。`main` 有分支保护，只能走 PR，直推报 GH013。历史起点是 commit `0cb3a41`。

## 改动涉及领域概念时全仓搜旧词

现行纪律见根 `AGENTS.md` `## 改动纪律`：删改领域概念时全仓搜旧词，范围含模型图、表结构、Redis 键、用户故事与 issue。历史起点是 commit `d5c24c2`。

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

**2026-11-25 现行入口**：一条命令跑完全部——`./scripts/check-all.sh`（会自动探 JDK 25，前端步骤固定 `env -u NODE_ENV`）。日常可 `--fast` 跳过 Maven。仓库级快检用 `.githooks/pre-commit`（`./scripts/install-hooks.sh` 启用），细节见 [environment](environment.md) 与 [guardrails](guardrails.md)。

**2026-11-16 交接记录**（分步命令，已由上面的脚本收口）：

- 后端 `mvn verify`（先设 `JAVA_HOME`，见 [environment](environment.md)）
- ~~前端 `pnpm test && pnpm build && pnpm lint`~~（superseded，见下方 2026-11-22 更新）
- 文档 `node scripts/check-doc-links.mjs`（**2026-11-17，`b987a6f`，PR #33**）：~~扫 `docs/**/*.md`、`AGENTS.md`、`GLOSSARY.md`、`CODING_STANDARDS/` 的相对链接与 `docs/wiki/` 孤儿页~~（扫描范围已扩展，superseded，见下方 2026-11-22 更新），**命中即红（blocking）**；扫描范围与有意不查项见 [guardrails](guardrails.md)。

> **2026-11-22 更新（Issue #81）**：前端本地校验统一收口为 **`pnpm --dir web check`**（依次执行 `tsc --noEmit`、`eslint .`、`ui:check`、`vitest run`、`vite build`）；`scripts/check-doc-links.mjs` 扫描范围扩展至顶层模块根文档 `*/AGENTS.md` 与 `*/DESIGN.md`（覆盖 `web/AGENTS.md` 与 `web/DESIGN.md`）；`ci.yml` 各步骤行号同步位移，见 [guardrails](guardrails.md)。

> **2026-11-16 更新（`3701bd4`，PR #28）**：后端现在可以用 **`./mvnw verify`**——wrapper 已提交（`mvnw` / `.mvn/wrapper/maven-wrapper.properties`，Maven 3.9.16，`only-script`），不必依赖本机装的 `mvn`。**但 `JAVA_HOME` 仍要手动 export 到 JDK 25**：enforcer 门槛已从 `[21,)` 提到 **`[25,)`**（`pom.xml:128`），**不 export 会在最开始就被拦下**，不再只是 toolchain 阶段失败。wrapper 解决的是 Maven 版本，不是 JDK 版本。

**2026-11-16 复核**：这两条命令**都不覆盖术语检查**。CI 里那一步（`ci.yml:95`）是 advisory，`scripts/check-glossary.sh:97` 恒 `exit 0`。所以上面「全仓搜旧词」那条纪律**只能靠人跑脚本 + 逐条判断**，跑绿了不代表旧词清干净了。各检查拦不拦见 [guardrails](guardrails.md)。

> **2026-11-17 更正（`b987a6f`，PR #33）**：上条引的 `ci.yml:95` 是旧号，术语检查步骤现位移到 `ci.yml:99-100`；同期新增的链接检查 `ci.yml:94-95`（`check-doc-links.mjs`）是 **blocking**，与术语 advisory 不是一类。术语脚本仍恒 `exit 0`，结论不变。

## 评审前先读规范

评审任何 diff 之前先读对应技术栈的规范：后端 `CODING_STANDARDS/java.md`，前端 `CODING_STANDARDS/typescript.md`，两边都动过就读两份。现行规定与理由见根 `AGENTS.md` `## 代码评审`。

## PR 标 Ready 前的收口检查

**2026-11-22 追加（源自 #68 / PR #77 复盘，Issue #81）**：

- **PR 从 Draft 标 Ready（或请求 owner 合并）前，必须先跑一遍双轴 `/code-review`**：只跑单测与多轮视觉检查仍可能漏过领域约束（例如 PR #77 曾险些带出违反 ADR-0014 的 `silhouette.ts` 与未同步源 Issue）。收口时必须对 `origin/main...HEAD` 跑双轴 review（`Standards` 轴对照 `CODING_STANDARDS/`、`Spec` 轴对照源 Issue 与设计基线），修完发现的问题并重跑校验绿灯后，才将 PR 标为 `Ready for review` 或交由 owner 合并。
- **交互/视觉迭代改动了原 Issue 范围或文案时同步回写源 Issue**：多轮打磨改变布局、范围或文案后，同步修订对应源 Issue 正文留痕；若改动了 `#2`、`#7` 等规格/实施计划类 Issue 正文，仍按上文「改 issue 正文必须把 before/after 贴进 PR 正文」要求，将每处 `before/after` 贴进 PR 正文 Evidence 段。

> **2026-11-23 更正（`main` = `ab6e032`，部分 `superseded`）**：上条「所有 PR 标 Ready 前无条件跑双轴 `/code-review`」口径已 `superseded`，现行分级门槛（集成收官 1 轮 / 核心改动首轮 1 次、不另开空窗口 Re-Review / 纯文档自核）见根 `AGENTS.md` `### Pull requests`。「交互/视觉迭代改动了原 Issue 范围或文案时同步回写源 Issue」继续有效。

> **2026-11-25 更新**：**现行口径已全部收口到**根 `AGENTS.md` `### Pull requests` 与 [docs/agents/pull-requests.md](../agents/pull-requests.md) 的 `## Code Review 门槛`，本页不再维护门槛细节，只留上面这条教训与历史记录。**单测与截图看不出的领域约束，只有对照规范与源 Issue 的双轴评审能抓。**

## PR 描述格式

三段模板（Summary 给图或树，Evidence 给 before/after，Merge Danger 标单向门还是双向门）与 Code Review 门槛都在 [docs/agents/pull-requests.md](../agents/pull-requests.md)。

## 2026-11-25 /retro 两条实测教训

- **评审修复若涉及跳转、守卫或 store 生命周期，动手修前先补失败回归用例。** 这类改动横跨渲染时机与卸载清理，靠肉眼比对 diff 判断「修好了」的命中率很低；先让新用例红，再改到它绿，才不会用另一种时序缺陷换掉原来的。
- **多次读取长 Issue（如 `#2`、`#7`）前先一次落盘**：`gh issue view <n> --json updatedAt,body > /tmp/<n>.json`，之后读本地文件。`--json updatedAt` 会带上 GitHub 的更新时间戳（正文本身不含时间），据此判断读到的是哪一版；重复远端请求既慢，又容易在正文被改动时前后读到两个版本。

## 定期文档与术语语义巡检（跨工具入口）

**2026-11-22 补充（`main` = `1230dfb`，规格见 `#60` 及同日更新评论）**：

- **触发节奏**：每 3 天一次（例如 `09:30 Asia/Shanghai`，cron `30 9 */3 * *`），或在开发开工前由任意支持 `git` 与 `gh` CLI 的工具手动执行一次。本机定时配置独立于仓库，换工具或换机器时按下方口令重建即可。
- **看板定位**：原 `#62` 因早期正文过长已于 2026-11-22 关闭归档；后续按标题 `docs: 文档同步待人工判断` 动态查找当前 `OPEN` 状态的滚动 issue。
- **硬约束**：不直接改 `docs/adr/` 正文、`GLOSSARY.md` 定义或源码（仅在 PR 正文或评论给建议）；不自动合并、不直推 `main`、不删远端分支、不改既有 issue/PR 正文；触发 PR 优先复用既有 `OPEN` 的 `docs/sync-` 分支，详见 `#60`。
- **可复制执行口令**（任意支持 `git`/`gh` CLI 的工具通用，先拉 `origin/main` 不碰主工作区）：

```text
在 sunshine-hub 仓库按 issue #60（含 2026-11-22 更新评论）执行一次文档与术语语义巡检：先 git fetch origin main，再按标题查找当前 OPEN 的 `docs: 文档同步待人工判断` 滚动 issue（若无或上次 `<!-- docs-semantic-review: ... -->` 水线后无新候选与提交则输出 no-op 退出）。对照 origin/main 跑 `node scripts/check-doc-links.mjs`、`node --test scripts/*.test.mjs` 与 `./scripts/check-glossary.sh`，结合近期已合 PR 与 open issue 区分真实过时与有意保留的历史墓碑。有把握的 `docs/wiki/` 更正（遵循 docs/wiki/index.md Rule 3，<=5 文件 <=200 行）优先复用现有 OPEN 的 `docs/sync-` PR，否则从 `origin/main` 另开 `--no-link` 临时 worktree（如 `../sunshine-hub-semantic`）提交并开 `docs:` PR，跑通链接与脚本单测后清理 worktree；拿不准或需改 ADR/GLOSSARY/源码的项追加到滚动 issue 评论。只要本次非 no-op，结束时均在滚动 issue 末尾追加 `<!-- docs-semantic-review: <ISO-8601> main=<sha> -->` 水线。严禁自动合并、直推 main、删远端分支或改既有 issue/PR 正文。
```

> **2026-11-23 更新（`main` = `ab6e032`，上文 2026-11-22 可复制口令已 `superseded`）**：`#62` 已归档，当前 `OPEN` 滚动 issue 为 `#93`（仍按标题动态查找）；GitHub 会将超长滚动评论自动折叠（`isMinimized: true` / `marked as abuse`），导致 `gh issue view <num> --comments` 隐藏正文，读取评论须改走 GitHub REST API（见下方现行口令）。

**现行可复制执行口令（2026-11-23）**：

```text
在 sunshine-hub 仓库按 issue #60（含 2026-11-22 更新评论）执行一次文档与术语语义巡检：先 git fetch origin main，再按标题查找当前 OPEN 的 `docs: 文档同步待人工判断` 滚动 issue（当前为 #93，#62 已归档）。读取滚动 issue 评论必须改用 REST API `gh api repos/a-RunShine/sunshine-hub/issues/<num>/comments --jq '.[] | {id, created_at, body}'`（禁止仅用 `gh issue view <num> --comments`，以免长评论被折叠为 isMinimized: true / marked as abuse 而漏读正文）；若无 OPEN 滚动 issue 或上次 `<!-- docs-semantic-review: ... -->` 水线后无新候选与提交则输出 no-op 退出。对照 origin/main 跑 `node scripts/check-doc-links.mjs`、`node --test scripts/*.test.mjs` 与 `./scripts/check-glossary.sh`，结合近期已合 PR 与 open issue 区分真实过时与有意保留的历史墓碑。有把握的 `docs/wiki/` 更正（遵循 docs/wiki/index.md Rule 3，<=5 文件 <=200 行）优先复用现有 OPEN 的 `docs/sync-` PR，否则从 `origin/main` 另开 `--no-link` 临时 worktree（如 `../sunshine-hub-semantic`）提交并开 `docs:` PR，跑通链接与脚本单测后清理 worktree；拿不准或需改 ADR/GLOSSARY/源码的项追加到滚动 issue 评论。只要本次非 no-op，结束时均在滚动 issue 末尾追加 `<!-- docs-semantic-review: <ISO-8601> main=<sha> -->` 水线。严禁自动合并、直推 main、删远端分支或改既有 issue/PR 正文。
```
