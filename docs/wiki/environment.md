# 环境与工具链

agents 在这个仓库里踩过的坑，以及绕开它们的正确姿势。每条都带日期或 commit。

相关页：[index](index.md) · [workflow](workflow.md) · [guardrails](guardrails.md) · [open-loops](open-loops.md)

## 现行环境（2026-11-25 实测，macOS 本机 worktree）

**先认清自己在哪台机器上。** 本节是现行清单；2026-11-16 那批与云主机那批旧记录已折叠到文末「历史环境归档（已取代）」，读旧段落前先确认它讲的是哪台机器。

| 项 | 现行值（2026-11-25，`main` = `f7651da`） |
| --- | --- |
| 机器 | macOS（Apple Silicon），本机开发，不是云主机 |
| JDK | Temurin 25 在 `/Library/Java/JavaVirtualMachines/temurin-25.jdk/Contents/Home`；`/usr/libexec/java_home -v 25` 可直接解析 |
| `JAVA_HOME` | 环境里是 `/Users/sunshine/.jenv/versions/25`（jenv 符号链接，指向同一 Temurin 25）。**`.jenv` 默认是 17**，不显式 export 就会踩到 enforcer 的 `[25,)` 门槛 |
| `NODE_ENV` | 本机 shell 里**预设为 `production`**——这是 `vite dev` 与 `vitest` 的头号暗坑，见下节 |
| node / pnpm | node 26.0.0 / pnpm 12.3.4（`packageManager` 钉 12.21.0，corepack 生效时以它为准） |
| `gh` | 已登录 `a-RunShine`，issue / PR 的读写都走它 |
| Orca | `/Applications/Orca.app/Contents/Resources/bin/orca`；本 worker 的派工入口是 `orca orchestration`（`check` / `ask` / `send` / `worker-start`），不是 `dsh` 命令行 |
| 中间件 | `docker compose up -d` 起 MySQL(33306)、Redis(36379)、RocketMQ；broker 健康检查探 30911。端口刻意避开本机已有容器，别改回默认值 |

**Agent 派工路径**：本机是 Orca 多 Agent IDE，worker 由 `orca orchestration worker-start --spec "<子任务>" --worktree current --agent <agent> --json` 起，回信用 `orca orchestration reply --id <message_id>`，收尾用 `orca orchestration send --type worker_done`。`dsh` 自身是宿主运行时，不作为派工命令使用。

## `NODE_ENV=production` 会污染 `vite dev` 与 `vitest`

**2026-11-25 实测并已加拦截。**

本机 shell 预设 `NODE_ENV=production`，而 Vite 与 Vitest 读它决定依赖预构建分支与 React 开发期校验。结果是最难查的一类失败：`pnpm --dir web test` 里 React 的生产构建路径被启用，`StrictMode` 的双调用与开发期告警消失，mock 与路由行为跟着漂移，报错却指向用例本身。

**已在 [vite.config.ts](../../web/vite.config.ts) 拦下**：配置改成 `defineConfig(({ mode }) => ...)`，当 `mode` 是 `development` 或 `test` 且 `process.env.NODE_ENV === 'production'` 时直接抛错，提示改用 `env -u NODE_ENV`。`pnpm --dir web build` 与 `vite preview` 走 `mode === 'production'`，不受影响。判定逻辑抽在 [web/vite-env-guard.ts](../../web/vite-env-guard.ts) 里，回归测试在 `web/src/test/viteEnvGuard.test.ts`。

**正确姿势**：所有前端命令前面加 `env -u NODE_ENV`，例如 `env -u NODE_ENV pnpm --dir web test`、`env -u NODE_ENV pnpm --dir web check`。`scripts/check-all.sh` 与 `.githooks/pre-commit` 都内置了这个前缀。

## 一键全量校验：`scripts/check-all.sh`

**2026-11-25 新增。** 与 CI 三个 job 对齐，本地一条命令跑完：

```bash
./scripts/check-all.sh              # 全量：前端 check + 契约 + 文档 + 术语 + 脚本单测 + mvn verify
./scripts/check-all.sh --fast       # 跳过 mvn verify（等价 --skip-maven）
./scripts/check-all.sh --dry-run    # 只打印命令
./scripts/check-all.sh --resolve-java-home   # 只打印解析出的 JDK 25
```

**JDK 25 由脚本自己探**（[check-all.sh:70](../../scripts/check-all.sh) 的 `resolve_java_home`），顺序是 `CHECK_ALL_JAVA_HOME` → 当前 `JAVA_HOME`（校验主版本是 25）→ macOS Temurin 25 固定路径 → `/usr/libexec/java_home -v 25` → `~/.local/jdk25/jdk-25.0.5+8`。这样既绕开 `.jenv` 的 17 覆盖，也能在云主机上落到 `~/.local/jdk25`。前端那步固定用 `env -u NODE_ENV`。

**轻量 pre-commit**：`.githooks/pre-commit` 只跑快检（`check-doc-links.mjs`、`check-ui-primitives.mjs`，暂存区含 `web/` 且 `web/node_modules` 存在时再加 `tsc --noEmit` 与 `lint`）。用 `./scripts/install-hooks.sh` 设 `git config core.hooksPath .githooks` 启用，零新增 npm 依赖，不引 Husky、不建 root `package.json`。撤销：`git config --unset core.hooksPath`。

## 云主机与 macOS 的差异（2026-11-20 实测，保留作对照）

同一份脚本在两台机器上行为不同，跨机器接手时先看这张表：

| 项 | macOS 本机（现行） | 云主机（2026-11-20 实测） |
| --- | --- | --- |
| JDK 25 | `/Library/Java/JavaVirtualMachines/temurin-25.jdk/Contents/Home` | `/home/user/.local/jdk25/jdk-25.0.5+8` |
| `/Library/Java/...` | 存在 | **不存在** |
| `tr` | BSD，locale 敏感 | GNU coreutils 8.32，按字节工作、与 locale 无关 |
| `LANG` | 未设置，默认 C | `en_US.UTF-8` 已设置 |
| 派工路径 | `orca orchestration worker-start` | `create_agent`（`OrganizerAgent`） |

云主机上另有 `source ~/.local/jdk25/env.sh` 一并设好 `JAVA_HOME`、`PATH` 与 egress 代理所需的 `MAVEN_OPTS` 信任库；少设 `MAVEN_OPTS` 会在拉依赖时踩 TLS。macOS 本机没有这个脚本，用 `scripts/check-all.sh` 自己探 JDK。

## 后端构建

**2026-11-25 现行结论**：用 `./mvnw -B verify`，`JAVA_HOME` 必须指向 JDK 25，否则 `maven-enforcer-plugin` 在 `pom.xml:128` 的 `[25,)` 门槛当场拦下——**这是有意设计的护栏，不要绕过**。最省事的做法是 `./scripts/check-all.sh`，它会把 `JAVA_HOME` 设对并导好 `PATH`。

两条门是独立的两件事，别混：`maven-enforcer-plugin` 校的是**跑 Maven 的 JVM**（`[25,)`），`maven-toolchains-plugin` 校的是**编译用的 JDK**（`version 25` / `vendor temurin`）。runner 换到 25 之后两者对齐，但仍然是两条规则、两处配置。

`pom.xml:123-125` 的注释解释了为什么要有这条门：不拦的话报错是 `NoClassDefFoundError: JCTree$JCAnyPattern`，看起来像依赖缺失，完全不指向真正原因。**这笔账记在 Spotless 的 google-java-format 1.35 头上（它要 JDK 21+），不是 ArchUnit。**

**机器本地前提**：`~/.m2/toolchains.xml` 不在仓库里（`git ls-files` 查不到），内容指向本机 Temurin 25。换机器后 toolchain 找不到匹配项就会失败，而仓库里没有任何文件告诉你要建它。CI 不建这个文件，但因为 runner 的 JVM 本身就是 25，toolchain 由它满足。

**ArchUnit 静默失效**已被 `ArchUnitImportTest` 兜住。**那个测试红了不要改测试**，去查 ArchUnit 版本与 JDK 字节码的兼容性。

## 前端构建

**2026-11-25 现行结论**：`web/package.json` 有 `"packageManager": "pnpm@12.21.0"`，`web/.nvmrc` 是 `22`，与 CI 对齐；但仍然**没有 `engines` 字段**，所以「钉住了」不等于「强制了」。本地装什么版本全凭机器，要复现 CI 得自己对着 `.github/workflows/ci.yml` 核。

`web/pnpm-lock.yaml` 与生成物 `web/src/types/api.ts` **都已提交**，干净 clone 不必先跑 `gen:types`。CI 里显式跑 `gen:types` 之后紧跟 `git diff --exit-code -- src/types/api.ts`，漂移即红——**判断某个检查是否存在，要读 CI 全文，不能凭一句文档转述**（上一版文档曾把「会校验」写成事实，而那时 CI 里根本没这一步）。

新 worktree 里没有 `web/node_modules`，按 `pnpm --dir web install --offline || pnpm --dir web install` 装自己的一份，**不要软链到主仓**：并行跑前端 ticket 时共享的 `node_modules` 会互相覆盖（见 [guardrails](guardrails.md) 的 `new-worktree.sh` 一节）。

## issue 依赖：写后即时读会读到 0

**2026-11-16 实测**（`gh` 2.95.0）：给 issue #27 加 `--add-blocked-by 29` 之后**立刻**查 `gh api repos/a-RunShine/sunshine-hub/issues/27 --jq .issue_dependencies_summary.blocked_by` 返回 **0**，而 #29 明明是 OPEN；稍后再查同一条命令返回 **1**。

所以是**写后即时读的延迟**，不是命令坏了。危险在于 `docs/agents/issue-tracker.md` 正是推荐用这个 summary 判断「返回 0 表示可以开工」——照着做会在加完依赖的当下误判 ticket 已解锁。**做法**：加完依赖不要立刻信 summary，隔一步再查，或用 `gh issue view <n> --json blockedBy` 交叉核对（注意它把已关闭的也列出来，要自己按 `state == "OPEN"` 过滤）。

## `DOCS_SYNC_TOKEN`

**2026-11-20 记**：`.github/workflows/docs-sync.yml` 用 fine-grained PAT `DOCS_SYNC_TOKEN` 检出 main、开/更新 docs PR 与滚动 issue。token 值存在仓库 Secrets，**本页不记 token 值**，也不写进任何提交文件。权限仅本仓库：Contents / Pull requests / Issues 各 Read and write，Metadata Read。读操作走 workflow 顶层最小权限，写动作一律经这个 PAT。

## 历史环境归档（已取代）

下面几段是旧机器、旧工具与旧版本留下的记录。保留它们是为了让「这件事曾被误判」可追溯，**不要照着它们操作**。

**Qoder `mcp__builtin__create_chat_session` 派工（2026-11-16，已取代）。** 当时 runtime 里 `Agent` 工具的 subagent 类型全部不可用（`general-purpose` / `Explore` 报 disabled via disallowedTools，`claude` 报 Unknown agent type），可用替代是 `mcp__builtin__create_chat_session` 配 `callbackMode: "supervise"`，结果用 `read_chat_session` 取。**当前客户端不复存在这两个工具**，照着调用会失败；现行派工路径见上文 Orca 一节。

**enforcer 门槛的两次翻转（2026-11-16）。** `c5b5508` 上是 `[21,)`，所以当时记的「enforcer 只门 21+、编译才走 25」是对的；PR #28（`3701bd4`）把它改成 `[25,)` 之后又回到「enforcer 也门 25」，理由是「与 `.java-version` 和 toolchains 对齐」。**同一条断言在两个 SHA 上真假相反**，这就是引用本页时必须带 SHA 的原因。

**Maven wrapper 曾经不存在（2026-11-16 前）。** 当时本机没有 `mvnw`、没有 `.mvn/`，`.gitignore` 里那行 `!.mvn/wrapper/maven-wrapper.jar` 被当成残留。PR #28 补上了 wrapper（`only-script`、Maven 3.9.16），那行变成有效的例外规则，首次跑会联网取 Maven 发行包。

**Shell 与 locale 的旧结论（2026-11-16，2026-11-20 由 PR #56 取代）。** 旧记录说「本机默认 C locale，BSD `tr` 会按字节切碎中文，「export UTF-8 locale 就能绕开」」。**这三条现在都不成立**：`tr` 在 C locale 下打碎多字节是一个一般性陷阱（换工具时仍要警惕），但 `scripts/check-glossary.sh` 的两处 `tr` 已被 PR #56（`d654255`）换成 python3 显式按 UTF-8 解码拆词，与运行 locale 无关；修后 `LC_ALL=C` 与 `en_US.UTF-8` 输出逐字节一致，碎词与 mojibake 归零。

**`JAVA_HOME` 未设置、机器上只有 17/21（2026-11-16）。** 当时记录「`JAVA_HOME` 是空的、`.java-version` 内容 25 但没有任何东西消费它」。现在 `.jenv` 装有 25 的符号链接，但**默认仍解析到 17**，所以「每个人都要自己 export 或让脚本探」这条结论没变。
