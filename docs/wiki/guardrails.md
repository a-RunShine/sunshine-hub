# 护栏清单

机器替人拦什么、不拦什么。**不拦的那部分才是这一页的重点**——以为有兜底而实际没有，比明知没有更危险。

所有行号基于 **2026-11-16** 的 `main` = `c5b5508`。

相关页：[index](index.md) · [environment](environment.md) · [workflow](workflow.md) · [open-loops](open-loops.md)

## CI 只有一个 workflow

`.github/workflows/ci.yml`，触发条件 `pull_request` 与 `push: [main]`（`ci.yml:3-6`）。三个 job 互相独立，没有 needs 依赖。

### job `backend`（`ci.yml:9-37`）

| 步骤 | 干什么 | 拦不拦 |
| --- | --- | --- |
| `setup-java@v4` temurin 25（`:15-19`） | 装 JDK | — |
| `mvn -B verify`（`:22`） | 见下方展开 | **拦** |
| 核对 ArchUnit 真的执行了（`:30-37`） | grep surefire 报告 | **拦** |

`mvn verify` 里绑在 `verify` 阶段的三件事：

- **Spotless** `check`（`pom.xml:187`）：google-java-format 1.35.0，AOSP 变体（4 空格，`pom.xml:176-179`）。格式不对就红。
- **Checkstyle** `check`（`pom.xml:207`）：`failOnViolation=true` + `violationSeverity=warning`（`pom.xml:202-203`）——**warning 级也拦**，不是只拦 error。配置在 `config/checkstyle/checkstyle.xml`。
- **Surefire** 跑测试，版本 pin 在 `3.5.2`（`pom.xml:30`、`:166`）。

### job `frontend`（`ci.yml:39-77`）

pnpm 12（`:45-47`）+ node 22（`:49-53`），依次：`install --frozen-lockfile` → `gen:types` → `tsc --noEmit` → `lint` → `test` → `build`。**六步全拦**，没有 `continue-on-error`。

`gen:types` 每次从 `api/openapi.yaml` 重生成 `src/types/api.ts`。生成物已提交，所以这一步实际在校验它有没有漂移。详见 [environment](environment.md)。

### job `contract`（`ci.yml:79-95`）

| 步骤 | 拦不拦 |
| --- | --- |
| `npx @redocly/cli@latest lint api/openapi.yaml`（`:90`） | **拦** |
| `./scripts/check-glossary.sh`（`:95`） | **不拦（advisory）** |

## 唯一的 advisory：术语检查

`scripts/check-glossary.sh` **最后一行是 `exit 0`（`:97`）**，且 `set -uo pipefail`（`:15`）里没有 `-e`。无论命中多少排除词，退出码都是 0。

**这是有意设计，不是 bug。** 脚本头部 `:5-11` 写了理由：术语表里某个概念的排除词可能是另一个概念的正名——「库存」是 `Stock` 的正名，同时是 `Allocation` 的排除词；`Event` 的排除词是 `Campaign`，而 `Campaign` 本身是正名。机械检查判不了，所以脚本先把正名从排除词里剔掉，只输出候选，交给人挑。

**后果**：[workflow](workflow.md) 的「全仓搜旧词」纪律**没有机器兜底**。CI 日志里能看到候选，但不会拦人。漏改旧词只能靠评审。这条缺口记在 [open-loops](open-loops.md)。

## ArchUnit 静默失效的兜底

**2026-11-16 复核**：这是全仓最容易被误判为绿的一处。

Spring Boot 3.5.3 起默认带的 Surefire 有回归：**字段声明的 `@ArchTest` 会被静默跳过**，构建绿，报告里 `Tests run: 0`。规则装上了但一条没跑。仓库两处防它：

1. `pom.xml:30` 把 surefire pin 回 `3.5.2`，注释在 `:28-29`。
2. `ci.yml:30-37` 直接 grep `target/surefire-reports/com.sunshinefps.ArchitectureTest.txt`，匹配不到 `Tests run: [1-9]` 就 `::error::` + `exit 1`。

**只确认「跑了」，不锁具体条数**（`ci.yml:26-29` 的注释解释了为什么：规则数会随模块增减，拿数字当约束意味着每次增删都要同步这里，而忘了改不会有人提醒）。规则该不该删由 review 判断。

另有 `src/test/java/com/sunshinefps/ArchUnitImportTest.java` 兜住「ArchUnit 读不了当前 JDK 字节码」那一类失效。**那个测试红了不要改测试**，去查版本兼容性——见 [environment](environment.md)。

## `scripts/new-worktree.sh`

让 [workflow](workflow.md) 的「每个 ticket 一个 worktree」变便宜的工具。

```
./scripts/new-worktree.sh <branch> <dir> [base] [--no-link]
```

- `git worktree add <dir> -b <branch> <base>`（`:24`），base 默认 `HEAD`。
- 默认把主仓库的 `web/node_modules` **软链**过去（`:27`），省掉一次 `pnpm install`——包内容已在 pnpm store 里，几分钟大部分花在重建目录结构。

**软链意味着两个 worktree 共享同一份 `node_modules`。** 串行没问题，**并行跑两个前端 ticket 会互相覆盖**（`:9-10`）。并行时传 `--no-link`，进 worktree 后自己 `pnpm install`。

这条与阶段 1 / 阶段 2 可并行直接相关，见 [stages](stages.md)。

## 已知缺口

- `actions/setup-java@v4` 已废弃（`ci.yml:15`）。同批 `checkout@v4`、`setup-node@v4`、`pnpm/action-setup@v4` 也都是 v4。
- 术语检查不拦人（见上）。

两条都记在 [open-loops](open-loops.md)，来源是 **2026-11-16 交接记录**，本次复核确认仍然存在。