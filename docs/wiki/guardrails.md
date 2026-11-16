# 护栏清单

机器替人拦什么、不拦什么。**不拦的那部分才是这一页的重点**——以为有兜底而实际没有，比明知没有更危险。

所有行号基于 **2026-11-16** 的 `main` = `c5b5508`。

相关页：[index](index.md) · [environment](environment.md) · [workflow](workflow.md) · [open-loops](open-loops.md) · [contract-gaps](contract-gaps.md) · [decisions-2026-11-16](decisions-2026-11-16.md)

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
| `./scripts/check-glossary.sh`（`:95`） | **不拦（advisory）**，而且提取本身有 bug，见下方更正条 |

## 唯一的 advisory：术语检查

`scripts/check-glossary.sh` **最后一行是 `exit 0`（`:97`）**，且 `set -uo pipefail`（`:15`）里没有 `-e`。无论命中多少排除词，退出码都是 0。

**这是有意设计，不是 bug。** 脚本头部 `:5-11` 写了理由：术语表里某个概念的排除词可能是另一个概念的正名——「库存」是 `Stock` 的正名，同时是 `Allocation` 的排除词；`Event` 的排除词是 `Campaign`，而 `Campaign` 本身是正名。机械检查判不了，所以脚本先把正名从排除词里剔掉，只输出候选，交给人挑。

**后果**：[workflow](workflow.md) 的「全仓搜旧词」纪律**没有机器兜底**。CI 日志里能看到候选，但不会拦人。漏改旧词只能靠评审。这条缺口记在 [open-loops](open-loops.md)。

### 更正：它不只是 advisory，提取本身是坏的（2026-11-16）

> **2026-11-16 更正（范围 superseded）**：上面那句「**这是有意设计，不是 bug**」**只对 `exit 0` 成立，对术语提取逻辑不成立**。旧断言保留以显示它曾被当成整段脚本的定性。advisory 的理由（`:5-11`，排除词可能是别的概念的正名）依然站得住；**但提取出来的候选本身不可信**。

来源：**2026-11-16 并行护栏 worker 在分支 `chore/guardrails` 上的运行**（worktree `../sunshine-hub-guardrails`）。本会话同日在 `c5b5508` 上**独立复现**，证据如下。

**缺陷一：`tr` 按字节切，打碎多字节 UTF-8。**

`scripts/check-glossary.sh:39` 用 `tr '、' '\n'` 拆排除词（`:28` 拆正名时同样用 `tr '（' '\n'`）。`、` 是 U+3001，UTF-8 编码 `E3 80 81` 三字节。C locale 下 `tr` 把 SET1 当**三个独立字节**，SET2 只有 `\n` 一个字节，按 POSIX 用最后一个字符补齐——于是 `E3`、`80`、`81` **各自**映射成换行。任何含这三个字节之一的汉字都会被切碎，碎片被当成「术语」拿去 grep。

**这是 locale 相关的，不是无条件损坏**（2026-11-16 实测，本机 BSD `tr`）：

| 条件 | `printf '促销、秒杀活动\n' \| tr '、' '\n'` 的结果 |
| --- | --- |
| `LC_ALL=C` | 损坏：`促销` 的 `80` 字节被换成换行，输出乱码碎片 |
| `LC_ALL=en_US.UTF-8` | **正确**：`促销` / `秒杀活动` 两行 |
| 本机默认（`LANG`、`LC_CTYPE` **均未设置**） | 损坏，等同 C locale |

**脚本没有固定 locale**——`:15` 只有 `set -uo pipefail`，全文没有 `LC_ALL` / `LC_CTYPE` 设置。所以它**继承运行者的环境**：本机默认就踩坑，谁 export 了 UTF-8 locale 谁躲过。**同一份脚本在不同机器上给出不同候选集。**

跑一遍的实际输出（2026-11-16，`c5b5508`，只读脚本，不改文件）：

- 抬头写「排除词 **50** 个，其中 **30** 个是别的概念的正名已剔除，实际检查 **45** 个」——**50 − 30 ≠ 45**，碎片把术语集撑大了，这行算术本身就是损坏的证据。
- 候选里出现 `── （592 处）`、`── （622 处）`、`── 人（3 处）`、`── 件号（3 处）` 这类**乱码词与截断词**（`证件号` 被切成 `件号`）。它们命中数百处，把真候选淹掉。

**缺陷二：`GLOSSARY.md` 根本没把「大区」收进排除词。**

2026-11-16 复核：`GLOSSARY.md` 里 `大区` 出现 **0 次**，19 条 `_Avoid_` 没有一条含它。**所以即使提取完全正确，这个脚本也从来抓不到漏进 issue #7 第 50 行的那个词。** 一个已被 ADR-0011 整个删掉的领域概念，不在术语表的反向清单里——这是 [workflow](workflow.md) 那条纪律的**数据缺口**，与脚本 bug 独立。

**缺陷三：术语表自身不在扫描范围，而它正违反自己的排除词（2026-11-16 追加）。**

`scripts/check-glossary.sh:75` 有 `--exclude='GLOSSARY.md'`（排除自身合理，否则每条 `_Avoid_` 都会命中自己）。**代价是术语表内部的自相矛盾永远抓不到。**

实例：`GLOSSARY.md:93` 把「一人一单」列为 Purchase Limit 的排除词，而 **`GLOSSARY.md:28` 的 Flash Sale 定义自己就写着「有开售时刻、有配额、一人一单，售罄即止」**。同日 D1 拍板每人可买 2 件以上，**这一句连事实都错了**。

**注意区分**：「一人一单」**不是漏收的排除词**——它一直在 :93。问题是术语表用了自己禁的词，加上 D1 之后内容过时。**这属内容修订（PR #30 那一轮），不属 #29 的脚本修复范围。** 详见 [decisions-2026-11-16](decisions-2026-11-16.md) 的更正条与 [open-loops](open-loops.md)。

> **2026-11-16 二次复核（部分 superseded，基准 `e107847`）**：上面那个实例**已被人工修掉**——`GLOSSARY.md:28` 重写为「有开售时刻、有配额、**有本场额度**，售罄即止」，全分支「一人一单」在 GLOSSARY 里只剩 `:97` 的 `_Avoid_` 行（旧号 `:93`，因新增三个术语位移）。
>
> **但盲区本身一点没变**：`--exclude='GLOSSARY.md'` 还在，**这次是人工发现并修的，机器仍然抓不到术语表内部的自相矛盾**。所以缺陷三作为**护栏缺口**依然成立，只是它举的那个实例已失效。
>
> **残留一处**：`docs/adr/0002-purchase-limit-on-real-name.md` 的「"一人一单"认的是人，不是账号」仍在，因顶部加了取代说明块而**从 `:3` 位移到 `:9`**。**ADR 在扫描范围内，所以这一处机器能报出来**——前提是脚本的 locale 损坏先修好（缺陷一），否则候选集本身不可信。

**合起来的后果**：术语护栏**不是「advisory 所以不拦」，而是「既不拦、也扫不对、还漏了最该扫的词」**。[workflow](workflow.md) 里「跑绿了不代表旧词清干净」要升级成「**跑出来的候选本身不可信**」。

**边界与未验证项**：

- 修脚本属 `chore/guardrails` 那一轮（仓库内检查），**issue 正文那一半是 issue #27**，两者边界已划清，见 [open-loops](open-loops.md)。
- **CI 侧未验证**：CI 跑 ubuntu + GNU `tr`，GNU `tr` 不支持多字节是已知特性，据此推断 CI 上**无论 locale 都会损坏**——但本会话**没有在 CI 上实测**，标为待验证，不要据此声称 CI 一定坏。
- 附带观察：脚本的 grep 范围含 `*.md` 且不排除 `docs/wiki/`，本层入库后**wiki 散文也会产生候选**（实测命中 `docs/wiki/contract-gaps.md:42`）。写 wiki 时不必回避领域词，但要知道日志里会有自己。

## ArchUnit 静默失效的兜底

**2026-11-16 复核**：这是全仓最容易被误判为绿的一处。

Spring Boot 3.5.3 起默认带的 Surefire 有回归：**字段声明的 `@ArchTest` 会被静默跳过**，构建绿，报告里 `Tests run: 0`。规则装上了但一条没跑。仓库两处防它：

1. `pom.xml:30` 把 surefire pin 回 `3.5.2`，注释在 `:28-29`。
2. `ci.yml:30-37` 直接 grep `target/surefire-reports/com.sunshinefps.ArchitectureTest.txt`，匹配不到 `Tests run: [1-9]` 就 `::error::` + `exit 1`。

**只确认「跑了」，不锁具体条数**（`ci.yml:26-29` 的注释解释了为什么：规则数会随模块增减，拿数字当约束意味着每次增删都要同步这里，而忘了改不会有人提醒）。规则该不该删由 review 判断。

另有 `src/test/java/com/sunshinefps/ArchUnitImportTest.java` 兜住「ArchUnit 读不了当前 JDK 字节码」那一类失效。**那个测试红了不要改测试**，去查版本兼容性——见 [environment](environment.md)。

## 错误码双份同步：这条是 blocking

**2026-11-16 复核（`c5b5508`）**：`src/test/java/com/sunshinefps/ErrorCodeContractTest.java:29-46` 直接读 `api/openapi.yaml` 的 `ErrorCode` 枚举，与 `ErrorCode.java` 的成员做双向差集，**任一边缺一个就红**。它随 `mvn verify` 跑，所以是**拦人的**——与术语检查正好相反。

**它只比常量名**（`:22` 注释明写）：**文案与 HTTP 状态码不入契约枚举，改了它不管**。所以「码对上了」不等于「语义对上了」——`UNIT_POOL_INCONSISTENT` 两边都有，但契约没给 claim 声明 500 出口，这个测试照样绿。那类缺口见 [contract-gaps](contract-gaps.md)。

**对补契约的直接影响**：给第五个禁用态（失格/冷却）新增错误码时，**必须同时改 `ErrorCode.java` 与契约枚举**，否则 CI 红。这是 [contract-gaps](contract-gaps.md) 缺口 5 里那条耦合的来源。

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
- 术语检查不拦人（见上）。**2026-11-16 升级**：它还不止不拦——`tr` 在 C locale 下打碎多字节字符、`GLOSSARY.md` 未收「大区」，见上方更正条。
- **2026-11-16**：`GLOSSARY.md` 的反向清单缺「大区」这个已删概念（ADR-0011）。**补排除词是数据修复，与修脚本是两件事**，别混成一个 ticket。

三条都记在 [open-loops](open-loops.md)，前两条来源是 **2026-11-16 交接记录**，本次复核确认仍然存在；第三条来源是 **2026-11-16 `chore/guardrails` 护栏 worker**，本会话独立复现。