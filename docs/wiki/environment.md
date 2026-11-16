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

### 机器本地前提：`~/.m2/toolchains.xml`

**2026-11-16 复核**：`~/.m2/toolchains.xml` 在本机**存在**（文件时间 Nov 15 19:07），内容是 `jdk 25 / temurin` → `/Library/Java/JavaVirtualMachines/temurin-25.jdk/Contents/Home`。

**它没有提交进仓库**，`git ls-files` 查不到。这是一条**机器本地前提**：换一台机器，toolchain 找不到匹配项就会失败，而仓库里没有任何文件告诉你要建它。

**CI 不建这个文件，但 CI 是绿的**——`.github/workflows/ci.yml:15-19` 只跑 `setup-java@v4`（temurin 25），没有写 toolchains.xml 的步骤。main 上 run `43850258902`（`c5b5508`，2026-11-16T10:35:43Z）conclusion = `success`。**不要据此声称 CI 坏了**；CI 里跑 Maven 的 JVM 本身就是 25，toolchain 由它满足。

### 本机工具链快照

**2026-11-16 复核**：

- `JAVA_HOME` **未设置**（不是指向 17，是空）。交接记录里「本机默认 17」的说法要按这条读。
- 已装 JDK：`openjdk-17`、`zulu-17`、`zulu-21`、`temurin-25`（`/Library/Java/JavaVirtualMachines/`）。
- `mvn`、`pnpm`、`node` 都是 homebrew 装的（`/opt/homebrew/bin/`）。
- **没有 `mvnw`，没有 `.mvn/`**。`.gitignore` 里那行 `!.mvn/wrapper/maven-wrapper.jar` 是残留，别当成「有 wrapper」的证据。
- `.java-version` 内容是 `25`，但仓库里没有提交任何 jenv/asdf 配置去消费它——**没有任何东西自动设 `JAVA_HOME`，每个 agent 都得自己 export**。

**2026-11-16 交接记录**：ArchUnit 有一条静默失效的暗坑（版本读不了当前 JDK 字节码时规则会悄悄不生效），已被 `ArchUnitImportTest` 兜住。**那个测试红了不要改测试**，去查 ArchUnit 版本与 JDK 字节码的兼容性。

## 前端构建

**2026-11-16 交接记录**：pnpm 是 12。`web/pnpm-workspace.yaml` 的 `allowBuilds` 是这个版本的配置方式，**不是** `package.json` 的 `pnpm` 字段。写错地方不会报错，只会不生效。

### 版本钉子只钉在 CI 里

**2026-11-16 复核（`c5b5508`）**：`web/package.json` **没有 `packageManager` 字段，也没有 `engines`**；仓库里没有 `.nvmrc` / `.node-version`。node 22 与 pnpm 12 **只钉在 `.github/workflows/ci.yml:45-53`**。

后果：本地装什么版本全凭机器，CI 与本地可能不是同一套。要复现 CI，得自己对着 ci.yml 那几行核。

**干净 clone 仍然能跑**：`web/pnpm-lock.yaml` 与生成物 `web/src/types/api.ts` **都已提交**（`git ls-files` 可查），所以 `pnpm test` / `build` / `lint` 不必先跑 `gen:types`。CI 里仍显式跑一遍 `gen:types`（`ci.yml:59-61`），等于每次校验提交进去的那份生成物有没有漂移。

## 中间件

**2026-11-16 交接记录**：`docker compose up -d` 起 MySQL(33306)、Redis(36379)、RocketMQ。broker 健康检查探 30911。

端口刻意避开本机已有容器，**别改回默认值**。