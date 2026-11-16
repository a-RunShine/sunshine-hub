# 环境与工具链

agents 在这个仓库里踩过的坑，以及绕开它们的正确姿势。每条都带日期或 commit。

相关页：[index](index.md) · [workflow](workflow.md) · [guardrails](guardrails.md) · [open-loops](open-loops.md)

## 委派 subagent 的可用路径

**2026-11-16**：本 runtime 里 `Agent` 工具的 subagent 类型全部不可用。`general-purpose` 与 `Explore` 报 "disabled via disallowedTools configuration"，`claude` 报 "Unknown agent type"，可用类型列表为空。`~/.qoder-cn/settings.json` 里没有 `disallowedTools` 配置，所以这是 host 侧限制，不是项目配置问题。

同日 `list_agents` 只返回 `agent:default`（Qoder · SunShine），`teams` 为空。

**可用替代**：`mcp__builtin__create_chat_session`，配 `callbackMode: "supervise"`。新会话不继承历史，等于 fresh context；完成与需要授权时自动回调，不必轮询。省略 `workspaceId` 即沿用当前 workspace。结果用 `read_chat_session` 取。

这条路径满足 [workflow](workflow.md) 里「用 subagent 干活」的约定。若哪天 `Agent` 类型恢复了，优先用 `Agent`，因为它更轻。

## 后端构建

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

## Shell 与 locale：本机默认是 C，多字节工具会踩坑

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