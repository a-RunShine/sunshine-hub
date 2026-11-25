# 环境与工具链

agents 在这个仓库里踩过的坑，以及绕开它们的正确姿势。每条都带日期或 commit。

相关页：[index](index.md) · [workflow](workflow.md) · [guardrails](guardrails.md) · [open-loops](open-loops.md)

## 现行本机入口（2026-11-25 实测，macOS Apple Silicon）

**先看这张表再往下读。** 下面 2026-11-16 与 2026-11-20 的段落是历史记录，逐条带日期与 superseded 块保留；现行值以本节为准。

| 项 | 现行值（2026-11-25，`main` = `f7651da`） |
| --- | --- |
| 机器 | macOS Apple Silicon 本机（`/Users/sunshine/orca/workspaces/sunshine-hub/*` 下的 Orca worktree） |
| 已装 JDK | Temurin 25 `/Library/Java/JavaVirtualMachines/temurin-25.jdk/Contents/Home`、Zulu 21、Homebrew 17、Zulu 17 |
| `jenv` 全局默认 | **17**（`~/.jenv/version` 内容 `17`）；仓库树内的 `.java-version` 是 `25`，**在 worktree 根目录下 `jenv version` 才会选 25** |
| `JAVA_HOME` | 本机默认 shell 是 `/Users/sunshine/.jenv/versions/17`（受全局 `~/.jenv/version` 支配）；只有 `.java-version` 所在的仓库根才选 25。`./scripts/check-all.sh` 会自己探 25，不依赖这个变量 |
| node / pnpm | node **v26.0.0** / pnpm **12.3.4**（`web/package.json` 的 `packageManager` 钉 `pnpm@12.21.0`，corepack 生效时以它为准） |
| `LANG` | **`C.UTF-8`**（登录 zsh 实测）。**不是「未设置」**——2026-11-20 那张表里的「LANG 未设置，默认 C」已经过时 |
| `NODE_ENV` | 本机 agent shell 里**预设为 `production`**，见下方专节 |
| `gh` | 已登录 `a-RunShine`，issue / PR 读写都走它 |
| Orca | `/Applications/Orca.app/Contents/Resources/bin/orca`；`orca agent installed --json` 显示本机支持 `antigravity`（默认）与 `dsh` |
| 中间件 | `docker compose up -d` 起 MySQL(33306)、Redis(36379)、RocketMQ；broker 健康检查探 30911。端口刻意避开本机已有容器，**别改回默认值** |

**一条命令跑完全部校验**：`./scripts/check-all.sh`。它会自己探 JDK 25（绕开上面的 17 默认），前端步骤固定 `env -u NODE_ENV`，可 `--fast` 跳过 Maven。细节见下方「本地一键校验与 pre-commit」。

## Orca 派工路径（2026-11-25 实测）

**协调者从这里起 worker。** `orca` 不在默认 `PATH` 里，用绝对路径 `/Applications/Orca.app/Contents/Resources/bin/orca`；先 `orca agent installed --json` 确认可用 agent，本机现有 `antigravity` 与 **`dsh`**（DeepSeek Harness）。

```sh
# 在当前 worktree 里派一个 dsh worker
orca orchestration worker-start --from <协调者 terminal> \
  --agent dsh --environment local \
  --spec "<子任务>" --worktree current --json

# 新建 worktree 时换成：--worktree new-top-level --repo id:<repoId>
```

**worker 侧**：读消息用 `orca orchestration check --terminal <terminal>`；回协调者的提问用 `orca orchestration reply --id <message_id> --body "..."`；收尾用 `orca orchestration send --type worker_done --subject "..." --outcome succeeded|failed`。完整命令面见 `$ORCA skills get orchestration`。

## `NODE_ENV=production` 会污染 `vite dev` 与 `vitest`（2026-11-25）

本机 agent shell 预设 `NODE_ENV=production`，而 Vite 与 Vitest 读它决定依赖预构建分支与 React 开发期校验。失败表现最难查：React 生产构建路径被启用，`StrictMode` 双调用与开发期告警消失，mock 与路由行为跟着漂移，报错却指向用例本身。

**已在 [web/vite.config.ts](../../web/vite.config.ts) 拦下**：配置改成 `defineConfig(({ mode }) => ...)`，当 `mode` 是 `development` 或 `test` 且 `process.env.NODE_ENV === 'production'` 时直接抛错；判定逻辑在 [web/vite-env-guard.ts](../../web/vite-env-guard.ts)，回归测试在 `web/src/test/viteEnvGuard.test.ts`。`pnpm --dir web build` 与 `vite preview` 走 `mode === 'production'`，不受影响。

**正确姿势**：前端命令前面加 `env -u NODE_ENV`，例如 `env -u NODE_ENV pnpm --dir web test`、`env -u NODE_ENV pnpm --dir web check`。`scripts/check-all.sh` 与 `.githooks/pre-commit` 都内置了这个前缀。

## 本地一键校验与 pre-commit（2026-11-25）

```bash
./scripts/check-all.sh                       # 全量：前端 check + 契约 + 文档 + 术语 + 脚本单测 + mvn verify
./scripts/check-all.sh --fast                # 跳过 mvn verify（等价 --skip-maven）
./scripts/check-all.sh --dry-run             # 只打印命令
./scripts/check-all.sh --resolve-java-home   # 只打印解析出的 JDK 25
```

**JDK 25 探测顺序**（[check-all.sh:70](../../scripts/check-all.sh) 的 `resolve_java_home`）：`CHECK_ALL_JAVA_HOME` → 当前 `JAVA_HOME`（核主版本）→ macOS Temurin 25 固定路径 → `/usr/libexec/java_home -v 25` → `~/.local/jdk25/jdk-25.0.5+8`。**探测只在需要 Maven 时强校验**：`--fast` / `--skip-maven` 完全不碰 JDK（没 JDK 25 也能跑前端与文档），`--dry-run` 探不到只打印占位符，只有真跑 `./mvnw -B verify` 或 `--resolve-java-home` 时才报错退出。

**轻量 pre-commit**：[.githooks/pre-commit](../../.githooks/pre-commit) 跑 `check-doc-links.mjs` 与 `check-ui-primitives.mjs`，暂存区有 `web/` 改动且 `web/node_modules` 存在时再加 `tsc --noEmit` 与 `lint`。用 `./scripts/install-hooks.sh` 设 `git config core.hooksPath .githooks` 启用；零新增 npm 依赖，不引 Husky、不建 root `package.json`。撤销：`git config --unset core.hooksPath`；单次绕过：`git commit --no-verify`。

## 先认清是哪一台机器（2026-11-20）

> **2026-11-25 更新**：**当前 runtime 又回到 macOS 本机**，下面这段 2026-11-20 的云主机实测降级为对照表。macOS 列的旧值（`LANG` 未设置、node/pnpm homebrew 版本）同样过时——现行值见本页顶部表格。

**本页 2026-11-16 的全部记录都来自一台 macOS 机器。当前 runtime 不是那台。** 不先分清这一点，下面的路径与工具名会把新 agent 直接带进墙里。

**2026-11-20 实测**（`uname -srm` = `Linux 6.6.95.bck.4-rc5-amd64 x86_64`）：

| 项 | macOS 那台（本页旧记录） | 当前云主机（2026-11-20 实测） |
| --- | --- | --- |
| JDK 25 | `/Library/Java/JavaVirtualMachines/temurin-25.jdk/Contents/Home` | `/home/user/.local/jdk25/jdk-25.0.5+8`（`openjdk 25.0.5`） |
| `/Library/Java/...` | 存在 | **不存在** |
| `tr` | BSD，locale 敏感 | **GNU coreutils 8.32**，按字节工作、与 locale 无关 |
| `LANG` | 未设置，默认 C | **`en_US.UTF-8` 已设置** |
| `gh` | 2.95.0 | 2.104.0，已登录 `a-RunShine` |
| node / pnpm | homebrew | node 22.23.4 / pnpm 11.7.0（CI 仍钉 pnpm 12，本地与 CI 不同版本） |

> **2026-11-25 更新**：上表右列是**云主机**的事实，当前 macOS 本机不适用。本机 `LANG` 是 `C.UTF-8`（登录 zsh）而非「未设置」，`tr` 是 BSD，node/pnpm 是 v26.0.0 / 12.3.4。本机入口见页首「现行本机入口」。

**JDK 有现成的设法，不要手抄路径**：`source ~/.local/jdk25/env.sh` 会一并设好 `JAVA_HOME`、`PATH` 与 egress 代理所需的 `MAVEN_OPTS` 信任库。少设 `MAVEN_OPTS` 会在拉依赖时踩 TLS。

> **2026-11-25 更新**：这条只适用于云主机。macOS 本机没有 `~/.local/jdk25/env.sh`，用 `./scripts/check-all.sh` 自己探 JDK 25。

**GitHub 写操作走 `gh` CLI。** GitHub MCP 的写工具在当前客户端不可用；issue / PR 的创建、评论、打标签、合并一律用 `/home/user/.local/bin/gh`。读也建议用它，省一次能力探测。

## docs-sync workflow 的 PAT：`DOCS_SYNC_TOKEN`

**2026-11-20 记**：`.github/workflows/docs-sync.yml` 用 fine-grained PAT `DOCS_SYNC_TOKEN` 检出 main、开/更新 docs PR 与滚动 issue。token 值存在仓库 Secrets，**本页不记 token 值**，也不写进任何提交文件。

权限仅本仓库：

| 权限 | 级别 |
| --- | --- |
| Contents | Read and write |
| Pull requests | Read and write |
| Issues | Read and write |
| Metadata | Read |

读操作走 workflow 顶层最小权限（contents / pull-requests / issues 均 read）；写动作一律经这个 PAT。

## 委派 subagent 的可用路径

> **2026-11-25 更新**：下文两条路径都已不是现行。本机现在用 Orca 派工——`/Applications/Orca.app/Contents/Resources/bin/orca orchestration worker-start --agent dsh --environment local --worktree current --repo id:<repoId>`，见页首「Orca 派工路径」。下面 2026-11-16/11-20 的记录按历史保留。

> **2026-11-20 更正（superseded）**：下面整段是 macOS 那台机器的 runtime 限制，**不适用于当前云主机**。当前 `create_agent`（`OrganizerAgent`）可用，本轮的 #48–#54、#29、#45/#46 三条实现线都是这样派出去的；`mcp__builtin__create_chat_session` 与 `read_chat_session` 在当前客户端不存在，照着调用会失败。原记录按历史保留。

**2026-11-16**：本 runtime 里 `Agent` 工具的 subagent 类型全部不可用。`general-purpose` 与 `Explore` 报 "disabled via disallowedTools configuration"，`claude` 报 "Unknown agent type"，可用类型列表为空。`~/.qoder-cn/settings.json` 里没有 `disallowedTools` 配置，所以这是 host 侧限制，不是项目配置问题。

同日 `list_agents` 只返回 `agent:default`（Qoder · SunShine），`teams` 为空。

**可用替代**：`mcp__builtin__create_chat_session`，配 `callbackMode: "supervise"`。新会话不继承历史，等于 fresh context；完成与需要授权时自动回调，不必轮询。省略 `workspaceId` 即沿用当前 workspace。结果用 `read_chat_session` 取。

这条路径满足 [workflow](workflow.md) 里「用 subagent 干活」的约定。若哪天 `Agent` 类型恢复了，优先用 `Agent`，因为它更轻。

## 后端构建

> **2026-11-25 更新**：结论仍成立且更硬——本机 `jenv` 全局默认就是 17（`~/.jenv/version` 内容 `17`），只有 `.java-version` 所在的仓库根会选 25。现行做法是直接 `./scripts/check-all.sh`，它把 `JAVA_HOME` 探好并导好 `PATH`；手工 export 仍可用，路径见下。

**2026-11-16 交接记录**：`mvn verify` 需要 `JAVA_HOME` 指向 JDK 25，本机默认 17。`maven-enforcer-plugin` 会拦下来并给明确报错——**这是有意设计的护栏，不要绕过它**。

```
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-25.jdk/Contents/Home
```

### 更正：enforcer 门的是 21+，不是 25

**2026-11-16 复核（`main` = `c5b5508`）**：上面那条「enforcer 要求 JDK 25」**不准确，已被本条取代**。两条门是分开的：

| 门 | 位置 | 校什么 | 阈值 |
| --- | --- | --- | --- |
| `maven-enforcer-plugin` | `pom.xml:127-129` | **运行 Maven 的 JVM** | `requireJavaVersion` = `[21,)` |
| `maven-toolchains-plugin` | `pom.xml:89-108` | **编译用的 JDK** | `version 25` / `vendor temurin` |

所以 JDK 21 能过 enforcer，编译仍走 toolchain 挑的 25。上面那条 export 依然是最省事的做法，但**别把 enforcer 的报错读成「必须 25」**。

`pom.xml:122-126` 的注释说明了这条规则为什么存在：不拦的话，报错是 `NoClassDefFoundError: JCTree$JCAnyPattern`，看起来像依赖缺失，完全不指向真正原因。**注释把这笔账记在 Spotless 的 google-java-format 1.35 头上（它要 JDK 21+），不是 ArchUnit。** 派活时若有人转述成「ArchUnit 要 21+」，那是转述错了。

### 二次更正：enforcer 现在真的门 25 了（2026-11-16，`3701bd4`）

> **2026-11-16 更正（superseded）**：上面那条「enforcer 门的是 21+，不是 25」**已被 PR #28 推翻**。`main` = **`3701bd4`**（PR #28，2026-11-16 12:35:18 UTC 合并）上 `pom.xml:128` 是 **`<version>[25,)</version>`**，报错文案也改成「需要 JDK 25+，与 `.java-version` 和 toolchains 对齐」。
>
> **绕了一圈回到原点，但理由不同**：交接记录最初说「enforcer 要求 JDK 25」，在 `c5b5508` 上是错的（那时是 `[21,)`）；**在 `3701bd4` 上又变成对的了**。所以引用这条时**必须带 SHA**，否则无法判断谁对。
>
> **两条门现在对齐了**，但仍是两条独立的门：

| 门 | 位置（`3701bd4`） | 校什么 | 阈值 |
| --- | --- | --- | --- |
| `maven-enforcer-plugin` | `pom.xml:127-130` | **运行 Maven 的 JVM** | `requireJavaVersion` = **`[25,)`** |
| `maven-toolchains-plugin` | `pom.xml:91-106`（`version 25` 在 `:103`） | **编译用的 JDK** | `version 25` / `vendor temurin` |

`pom.xml:123-125` 的注释现在明写「门槛取 25 与 `.java-version`、toolchains 对齐（21+ 约束自然满足），让它在最开始就说清楚」。**Spotless 那笔账仍然记在 google-java-format 1.35 头上，不是 ArchUnit**，这一点没变。

**实际影响**：本机 `JAVA_HOME` 未设置、默认 JDK 不是 25，**现在 enforcer 会直接拦下**，不再只是 toolchain 阶段失败。上面那条 `export JAVA_HOME=...temurin-25...` 从「最省事的做法」变成**必需步骤**。

### 机器本地前提：`~/.m2/toolchains.xml`

**2026-11-16 复核**：`~/.m2/toolchains.xml` 在本机**存在**（文件时间 Nov 15 19:07），内容是 `jdk 25 / temurin` → `/Library/Java/JavaVirtualMachines/temurin-25.jdk/Contents/Home`。

**它没有提交进仓库**，`git ls-files` 查不到。这是一条**机器本地前提**：换一台机器，toolchain 找不到匹配项就会失败，而仓库里没有任何文件告诉你要建它。

**CI 不建这个文件，但 CI 是绿的**——`.github/workflows/ci.yml:15-19` 只跑 `setup-java@v4`（temurin 25），没有写 toolchains.xml 的步骤。main 上 run `43850258902`（`c5b5508`，2026-11-16T10:35:43Z）conclusion = `success`。**不要据此声称 CI 坏了**；CI 里跑 Maven 的 JVM 本身就是 25，toolchain 由它满足。

### 本机工具链快照

**2026-11-16 复核**：

- `JAVA_HOME` **未设置**（不是指向 17，是空）。交接记录里「本机默认 17」的说法要按这条读。
- 已装 JDK：`openjdk-17`、`zulu-17`、`zulu-21`、`temurin-25`（`/Library/Java/JavaVirtualMachines/`）。
- `mvn`、`pnpm`、`node` 都是 homebrew 装的（`/opt/homebrew/bin/`）。
- ~~**没有 `mvnw`，没有 `.mvn/`**。`.gitignore` 里那行 `!.mvn/wrapper/maven-wrapper.jar` 是残留，别当成「有 wrapper」的证据。~~

  > **2026-11-16 更正（superseded，`3701bd4`）**：**PR #28 已补上 Maven wrapper**。main 上现有 `mvnw`、`mvnw.cmd`、`.mvn/wrapper/maven-wrapper.properties`（`wrapperVersion=3.3.2`、`distributionType=only-script`、Maven **3.9.16**）。**`.gitignore` 那行不再是残留，是有效的例外规则。** 现在可以用 `./mvnw verify` 而不依赖本机装的 `mvn`；`only-script` 意味着 wrapper 只下载脚本、不提交 jar，首次跑会联网取 Maven 发行包。
- `.java-version` 内容是 `25`，但仓库里没有提交任何 jenv/asdf 配置去消费它——**没有任何东西自动设 `JAVA_HOME`，每个 agent 都得自己 export**。
- **`LANG` 与 `LC_CTYPE` 均未设置**（2026-11-16），shell 默认 C locale。与 `JAVA_HOME` 同类：**机器本地前提，仓库里没有任何文件说明它**，而它会让中文文本处理工具静默出错。见下方「Shell 与 locale」。

**2026-11-16 交接记录**：ArchUnit 有一条静默失效的暗坑（版本读不了当前 JDK 字节码时规则会悄悄不生效），已被 `ArchUnitImportTest` 兜住。**那个测试红了不要改测试**，去查 ArchUnit 版本与 JDK 字节码的兼容性。

## 前端构建

**2026-11-16 交接记录**：pnpm 是 12。`web/pnpm-workspace.yaml` 的 `allowBuilds` 是这个版本的配置方式，**不是** `package.json` 的 `pnpm` 字段。写错地方不会报错，只会不生效。

> **2026-11-25 更新**：本机实测 pnpm 12.3.4，`allowBuilds` 这条仍然有效。**新 worktree 里没有 `web/node_modules`**，装自己的一份：`pnpm --dir web install --offline || pnpm --dir web install`。`scripts/new-worktree.sh` 默认软链主仓 `node_modules` 省一次安装，**串行跑没问题**；并行跑两个前端 ticket 时必须传 `--no-link`（或各自 `pnpm install`），否则共享目录会互相覆盖，见 [guardrails](guardrails.md)。

### 版本钉子只钉在 CI 里

**2026-11-16 复核（`c5b5508`）**：`web/package.json` **没有 `packageManager` 字段，也没有 `engines`**；仓库里没有 `.nvmrc` / `.node-version`。node 22 与 pnpm 12 **只钉在 `.github/workflows/ci.yml:45-53`**。

后果：本地装什么版本全凭机器，CI 与本地可能不是同一套。要复现 CI，得自己对着 ci.yml 那几行核。

> **2026-11-16 更正（部分 superseded，`3701bd4`）**：**PR #28 已把版本钉进仓库**，上面那段不再成立：
>
> - `web/package.json:6` 现有 **`"packageManager": "pnpm@12.21.0"`**（精确到补丁号，比 CI 的 `version: 12` 更严）。
> - **`web/.nvmrc` 已存在，内容 `22`**，与 `ci.yml:51` 的 `node-version: '22'` 对齐。
> - **仍然没有 `engines` 字段**，也没有 `.node-version`。所以「钉住了」不等于「强制了」——`packageManager` 靠 corepack 生效，`.nvmrc` 靠 nvm/fnm 读取，**不用这些工具的机器仍然装什么版本都行**。
>
> **CI 侧的行号没变**：pnpm 12 在 `ci.yml:45-47`，node 22 在 `:49-53`。

**干净 clone 仍然能跑**：`web/pnpm-lock.yaml` 与生成物 `web/src/types/api.ts` **都已提交**（`git ls-files` 可查），所以 `pnpm test` / `build` / `lint` 不必先跑 `gen:types`。CI 里仍显式跑一遍 `gen:types`（`ci.yml:59-61`），等于每次校验提交进去的那份生成物有没有漂移。

> **2026-11-20 更正（superseded）**：上面末句「等于每次校验提交进去的那份生成物有没有漂移」**是错的**，而且这句错断言正是那个洞长期没被发现的原因——文档声称检查存在，于是没人再去看 CI 到底做了什么。
>
> 实况：CI 的顺序是 `pnpm gen:types` → `tsc --noEmit`。**重新生成会覆盖工作区里那份**，后面的 tsc 用的是新产物，所以**提交里那份过期也照样全绿**。当时的 ci.yml 里没有任何 `git diff` / `--exit-code`。
>
> **本轮已补上真的检查**：`gen:types` 之后新增一步 `git diff --exit-code -- src/types/api.ts`，漂移即红。从这时起，末句描述的行为才真正成立。
>
> **教训**：判断某个检查是否存在，要读 CI 全文，不能凭一句文档转述；`git show <ref>:<path>` 取不到内容时，先分清「文件不存在」与「路径是目录」，别把取不到读成没有。本轮 retro 就据此误判过一次 `CODING_STANDARDS`——它其实是个目录，`README.md` + `java.md` + `typescript.md` 三份俱全。

## Shell 与 locale：本机默认是 C，多字节工具会踩坑

> **2026-11-20 更正（superseded，`d654255` / PR #56）**：本节三处结论在当前云主机上都不成立，脚本缺陷也已修掉。
>
> - **「本机默认 C」不成立**：当前 `LANG=en_US.UTF-8` **已设置**，`tr` 是 **GNU coreutils 8.32**，不是 BSD。
> - **「固定 locale 就能绕开」不成立**：GNU `tr` 按字节工作、与 locale 无关，**UTF-8 下拆分就已经坏**（`证件号` → `件号`，产出 `单`/`号`/`费`/`余量` 等碎词，上游 grep 把文件误判成二进制）。C locale 只是额外多 mojibake。所以「export UTF-8 就够」这条绕法在 GNU 机器上无效。
> - **「CI 上未实测」已实测**：#56 的修复把两处 `tr` 换成 python3 显式按 UTF-8 解码后拆词，与运行环境 locale 无关。修后 `LC_ALL=C` 与 `en_US.UTF-8` 输出**逐字节一致**，碎词与 mojibake 归零，`大区` 从未收词表变成候选 33 处。
>
> **仍然有效的部分**：「按字符处理中文的 shell 工具会按字节处理」这个一般性陷阱本身没错，换工具时仍要警惕。原记录按历史保留。

**2026-11-16**，来源是并行护栏 worker 在分支 `chore/guardrails` 上的运行，本会话同日在 `c5b5508` 上独立复现。

**本机 `LANG` 与 `LC_CTYPE` 均未设置**，所以 shell 工具默认落在 C/POSIX locale。这一条本身无害，但**任何按字符处理中文的 shell 工具都会因此按字节处理**。

已确认的实例：`scripts/check-glossary.sh:39` 的 `tr '、' '\n'`（`:28` 的 `tr '（' '\n'` 同理）。`、` = U+3001 = `E3 80 81`，C locale 下这三个字节各自被映射成换行，汉字被切碎，碎片当成术语去 grep。

**本机 BSD `tr` 是 locale 敏感的**（2026-11-16 实测）：

```
printf '促销、秒杀活动\n' | tr '、' '\n' | od -c          # 损坏：促销 被切开
printf '促销、秒杀活动\n' | LC_ALL=en_US.UTF-8 tr '、' '\n'  # 正确：促销 / 秒杀活动
```

**所以同一份脚本在不同机器上给出不同候选集**——脚本没有固定 locale（`:15` 只有 `set -uo pipefail`）。要复现护栏 worker 看到的现象，**不要先 export UTF-8 locale**；要绕开它，`LC_ALL=en_US.UTF-8` 就够。

**未验证**：CI 是 ubuntu + GNU `tr`，GNU `tr` 不支持多字节是已知特性，据此推断 CI 上无论 locale 都损坏，但**本会话没有在 CI 上实测**。别据此声称 CI 一定坏。

> **2026-11-25 更新（`da135d4`）**：本机还有一处 `locale` 相关的静默丢词，**不是 `tr` 那条**。`scripts/check-glossary.sh` 的 `comm -23` 与两路 `sort -u` 此前都没有显式固定 `LC_ALL=C`：macOS 的 BSD `comm` 与 UTF-8 下 `sort` 的排序规则不一致，差集里整段中文词被静默丢掉（`实际检查 49 个` 缩成 `2 个`）。`da135d4` 把 `comm` 与两路 `sort` 一起固定成 `LC_ALL=C`，C 与 `en_US.UTF-8` 下输出逐字节一致。**这与 PR #56 修 `tr` 是两件事**，别合并归功。

完整的护栏后果（含 `GLOSSARY.md` 未收「大区」这条独立缺陷）见 [guardrails](guardrails.md) 的更正条；待办见 [open-loops](open-loops.md)。**本层只记录，不改脚本**——修复属 `chore/guardrails` 那一轮。

## issue 依赖：写后即时读会读到 0

**2026-11-16 实测**（`gh` 2.95.0）：给 issue #27 加 `--add-blocked-by 29` 之后**立刻**查

```
gh api repos/a-RunShine/sunshine-hub/issues/27 --jq .issue_dependencies_summary.blocked_by
```

返回 **0**，而 #29 明明是 OPEN。稍后再查同一条命令返回 **1**，`gh issue view 27 --json blockedBy` 也立刻就能看到 #29。

所以是**写后即时读的延迟**，不是命令坏了。危险在于 `docs/agents/issue-tracker.md` 正是推荐用这个 summary 判断「返回 0 表示可以开工」——照着做会在加完依赖的当下误判 ticket 已解锁，然后开工一个其实被阻塞的 ticket。

**做法**：加完依赖不要立刻信 summary，隔一步再查，或用 `gh issue view <n> --json blockedBy` 交叉核对（注意它把已关闭的也列出来，要自己按 `state == "OPEN"` 过滤）。

候选改进：把这条 caveat 补进 `docs/agents/issue-tracker.md`，让每个 agent 都看得到，而不是只躺在这一页。

## 中间件

**2026-11-16 交接记录**：`docker compose up -d` 起 MySQL(33306)、Redis(36379)、RocketMQ。broker 健康检查探 30911。

端口刻意避开本机已有容器，**别改回默认值**。
