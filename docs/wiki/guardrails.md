# 护栏清单

机器替人拦什么、不拦什么。**不拦的那部分才是这一页的重点**——以为有兜底而实际没有，比明知没有更危险。

所有行号基于 **2026-11-17** 的 `main` = `b987a6f`（更早的 `c5b5508`、`3701bd4` 基准均已 superseded，见下方更正条）。

> **2026-11-16 基准更新（`3701bd4`，superseded 行号基准）**：PR #28（`3701bd4`，12:35:18 UTC）与 PR #30（`742ef1e`，12:35:06 UTC）已合并，当时**本页行号基准改为 `main` = `3701bd4`**。两次 CI 均 success（run `43867899360` / `43867932939`）。
>
> **`pom.xml` 有小幅位移**，受影响的本页引用：Spotless `check` 旧 `:187` → **`:190`**；Checkstyle `check` 旧 `:207` → **`:210`**；`failOnViolation`/`violationSeverity` 旧 `:202-203` → **`:203-204`**；enforcer 旧 `:127-129` → **`:127-130`**；toolchains 旧 `:89-108` → **`:91-106`**。**未位移**：surefire pin `:30`、AOSP 配置 `:176-179`、ArchUnit 兜底 `ci.yml:30-37`。**`pom.xml` 行号在 `b987a6f` 仍有效**（#33 未碰 `pom.xml`）。

> **2026-11-17 基准更新（`b987a6f`）**：PR #33（merge commit `b987a6f`，2026-11-17T02:21:29Z，来源 https://github.com/a-RunShine/sunshine-hub/pull/33 ）合并，**本页行号基准改为 `main` = `b987a6f`**；承载的 Issue #31（"chore: 文档链接加机器检查，别再靠手搓"）于 2026-11-17T02:21:31Z 由 #33 自动关闭（来源 https://github.com/a-RunShine/sunshine-hub/issues/31 ）。**`ci.yml` 只有 contract job 位移**：job 范围 `:79-95` → **`:79-100`**，新增「扫文档相对链接与 wiki 孤儿页」一步（`:94-95`）；backend（`:9-37`）、frontend（`:39-77`）范围未动。
>
> **superseded**：上一条基准写「`ci.yml` 行号未位移，三个 job 仍是 `:9-37` / `:39-77` / `:79-95`」——contract 范围这半句已被 #33 打破（扩到 `:100`）；更早的 `c5b5508` 基准同样过时。

相关页：[index](index.md) · [environment](environment.md) · [workflow](workflow.md) · [open-loops](open-loops.md) · [contract-gaps](contract-gaps.md) · [decisions-2026-11-16](decisions-2026-11-16.md)

## CI 只有一个 workflow

`.github/workflows/ci.yml`，触发条件 `pull_request` 与 `push: [main]`（`ci.yml:3-6`）。三个 job 互相独立，没有 needs 依赖。

### job `backend`（`ci.yml:9-37`）

| 步骤 | 干什么 | 拦不拦 |
| --- | --- | --- |
| ~~`setup-java@v4`~~ **`setup-java@v5`** temurin 25（`:15-19`） | 装 JDK | — |
| `mvn -B verify`（`:22`） | 见下方展开 | **拦** |
| 核对 ArchUnit 真的执行了（`:30-37`） | grep surefire 报告 | **拦** |

> **2026-11-16 更正（superseded，`3701bd4`）**：上表旧版写 `setup-java@v4`，并把它列进「已知缺口」说已废弃。**PR #28 已升到 `@v5`**（`ci.yml:15`），那条缺口已结。
>
> **但同批其它 action 仍是 v4，没一起升**：`checkout@v4`（`:13`、`:43`、`:83`）、`pnpm/action-setup@v4`（`:45`）、`setup-node@v4`（`:49`、`:85`）。**别把「setup-java 升了」读成「action 版本都升了」。**

`mvn verify` 里绑在 `verify` 阶段的三件事（行号按 `3701bd4`）：

- **Spotless** `check`（`pom.xml:190`，旧号 `:187`）：google-java-format 1.35.0，AOSP 变体（4 空格，`pom.xml:176-179`，未位移）。格式不对就红。
- **Checkstyle** `check`（`pom.xml:210`，旧号 `:207`）：`failOnViolation=true` + `violationSeverity=warning`（`pom.xml:203-204`，旧号 `:202-203`）——**warning 级也拦**，不是只拦 error。配置在 `config/checkstyle/checkstyle.xml`。
- **Surefire** 跑测试，版本 pin 在 `3.5.2`（`pom.xml:30`、`:166-167`，未位移）。

### job `frontend`（`ci.yml:39-77`）

pnpm 12（`:45-47`）+ node 22（`:49-53`），依次：`install --frozen-lockfile` → `gen:types` → `tsc --noEmit` → `lint` → `test` → `build`。**六步全拦**，没有 `continue-on-error`。

`gen:types` 每次从 `api/openapi.yaml` 重生成 `src/types/api.ts`。生成物已提交，所以这一步实际在校验它有没有漂移。详见 [environment](environment.md)。

### job `contract`（`ci.yml:79-100`）

| 步骤 | 拦不拦 |
| --- | --- |
| `npx @redocly/cli@latest lint api/openapi.yaml`（`:89-90`） | **拦** |
| `node scripts/check-doc-links.mjs`（`:94-95`，注释 `:92-93`） | **拦（blocking）**，2026-11-17 随 PR #33 新增，见下方「文档链接与孤儿页检查」 |
| `./scripts/check-glossary.sh`（`:99-100`，注释 `:97-98`） | **不拦（advisory）**，而且提取本身有 bug，见下方更正条 |

## 文档链接与孤儿页检查：这条是 blocking（2026-11-17，`b987a6f`）

**2026-11-17 复核（基线 `b987a6f`）**：`scripts/check-doc-links.mjs`（仅用 node 标准库、零新依赖）由 **PR #33** 合入（merge commit `b987a6f`，2026-11-17T02:21:29Z），接进 contract job（`ci.yml:94-95`）；承载的 **Issue #31** 于 2026-11-17T02:21:31Z 由 #33 自动关闭。来源：PR https://github.com/a-RunShine/sunshine-hub/pull/33 、Issue https://github.com/a-RunShine/sunshine-hub/issues/31 。

**命中即 `exit 1`，不做 advisory**（脚本头注释 `:4` 明写：advisory 的教训见 `check-glossary.sh` 与 issue #29）。**与术语检查正好相反**：术语护栏（#29）恒 `exit 0`、只出候选；这条断链 / 孤儿 / index 缺失任一命中就红。两者是各自独立的文档护栏，别混。

**扫描范围**（脚本 `:92-96`）：`docs/**/*.md`、根目录 `AGENTS.md`、`GLOSSARY.md`（存在才收）、`CODING_STANDARDS/**/*.md`。

**判定逻辑**：

- 提取链接前先遮罩代码块（围栏 `:63-69`）与行内代码（`maskCodeSpans` `:41-55`，调用 `:71`）——反引号里的路径与写法样例不当链接扫。
- 跳过外部 scheme（`EXTERNAL` `:25`，判定 `:75`）与纯锚点（`:78`）；锚点剥掉后只查文件存在（`:77`），`%` 解码后相对源文件所在目录解析（`:80-86`）。
- 断链：`existsSync` 失败即记 `broken`（`:107`），stderr 逐条 `file:line`（`:134`）。
- 孤儿页：`docs/wiki/` 不存在 → **跳过**孤儿检查（`:117-118`）；`docs/wiki/` 存在但 `index.md` 缺失 → **fail**（`wikiUnjudgeable`，`:119-121`、`:139`、`:144`）；存在 index 时，每个非 index 页必须出现在 `index.md` 的链接目标集合里，否则记孤儿（`:123-127`）。
- 退出码：`broken || orphans || wikiUnjudgeable` 任一为真即 `exit 1`（`:144`）。

**有意不做**（脚本头注释 `:12-14`）：

- **不校验锚点**：全仓当前零条带锚点的相对链接，GitHub slug 规则与本地渲染器不一致（中文标题尤甚），现在做等于给不存在的消费者猜规则；#31 里这条标「待定」。
- **不查外部链接**（http/https/mailto 等）：要走网络，不确定性不该进 CI。
- **不扫 issue 正文链接**：那属 #27，与 #29、#33 三者各自独立。

**本地复跑**：`node scripts/check-doc-links.mjs`（可带仓库根目录参数，用法 `:16`、根解析 `:23`）。

## 唯一的 advisory：术语检查

> **2026-11-17（`b987a6f`）**：contract job 新增的 `check-doc-links.mjs` 是 **blocking**（见上节），所以术语检查仍是全仓 CI 里**唯一**的 advisory——两条文档护栏不是一类，别合并定性。

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

> **2026-11-17 更正（部分 superseded，`b987a6f`）**：上条「CI 侧未验证、不要据此声称 CI 一定坏」**只对当时成立**。#29 评论（comment `6936038788`，来源 https://github.com/a-RunShine/sunshine-hub/issues/29#issuecomment-6936038788 ）已在 **main CI 日志**里实证乱码候选：`── （592 处）`、`── （622 处）`、`── 件号（3 处）`（`证件号` 被切成 `件号`）——即 CI 上 locale 损坏**确有实证**，不再是纯本机推断。**但这不等于 GNU `tr` 的全部行为都已完整验证**：实测只覆盖了日志里出现的这些候选，CI 上其它 locale / 输入组合仍未逐条跑过，别把这条扩写成「GNU `tr` 行为已定性」。

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

- ~~`actions/setup-java@v4` 已废弃（`ci.yml:15`）。~~ **2026-11-16 已结（superseded，`3701bd4`）**：PR #28 升到 `@v5`。**但同批 `checkout@v4`、`setup-node@v4`、`pnpm/action-setup@v4` 仍是 v4，这条缺口只结了一半。**
- 术语检查不拦人（见上）。**2026-11-16 升级**：它还不止不拦——`tr` 在 C locale 下打碎多字节字符、`GLOSSARY.md` 未收「大区」，见上方更正条。
- **2026-11-16**：`GLOSSARY.md` 的反向清单缺「大区」这个已删概念（ADR-0011）。**补排除词是数据修复，与修脚本是两件事**，别混成一个 ticket。

三条都记在 [open-loops](open-loops.md)，前两条来源是 **2026-11-16 交接记录**，本次复核确认仍然存在；第三条来源是 **2026-11-16 `chore/guardrails` 护栏 worker**，本会话独立复现。

### ⚠️ 术语检查在 PR #28 之后**仍然是 advisory，一个字没改**（2026-11-16 复核 `3701bd4`）

**不要把「护栏 PR 合并了」读成「术语护栏修好了」。** 逐项复核 main：

| 项 | 位置 | 状态 |
| --- | --- | --- |
| 恒 `exit 0` | `scripts/check-glossary.sh:97` | **未改** |
| CI 里不 fail | `ci.yml:94-95`，注释 `:92-93` 仍写「只输出候选，不 fail」 | **未改** |
| `tr` 多字节损坏 | `:28`（`tr '（'`）、`:39`（`tr '、'`），全文无 `LC_ALL` | **未改** |
| 术语表自身不在扫描范围 | `:75` `--exclude='GLOSSARY.md'` | **未改** |
| `GLOSSARY.md` 缺「大区」 | 全文 `大区` 出现 **0 次** | **未改**（PR #30 改了 GLOSSARY，但没补这个排除词） |

**这是有意的边界，不是遗漏**：PR #28 只做 wrapper / 版本固定 / JDK 门禁，**术语护栏整件事归 issue #29**（修 locale、补「大区」、修误报，**修干净之后才改 blocking**），issue 正文那一半归 **#27**（blocked by #29）。顺序不能反，否则一开 blocking 就拦住所有 PR。详见 [open-loops](open-loops.md)。

### 2026-11-17 补充：#29 范围再加两条——豁免机制先于 blocking，locale 验收信号

> **2026-11-17 评论（issue #29，comment `6936038788`，PR #33 合入后在 main CI 日志实证；来源 https://github.com/a-RunShine/sunshine-hub/issues/29#issuecomment-6936038788 ）**：#33 只加链接检查，**术语脚本一个字没碰**，上面列的缺陷与 advisory 定性仍然成立。该评论给 #29 的范围补了两条约束。

**新增约束：豁免机制必须先于改 blocking。** wiki（PR #26 已合）与 ADR 墓碑**必然提到被删概念**，那是历史记录，不是漏改。main CI 日志实测命中：`docs/wiki/workflow.md:10`（沟通教训里复述当时的提问）、`docs/wiki/decisions-2026-11-16.md:30`（D1 决策标题本身）、`docs/wiki/issue-3-review.md:66`、`docs/wiki/open-loops.md:76`（讨论 ZSET 与限流的区分）。**所以「命中改 blocking」之前必须先有豁免机制**，否则护栏会拦住「记录删除本身」的那一层。候选两条：

- **按路径豁免**（`docs/wiki/`、`docs/adr/` 的 superseded 块）：简单，但整页放行，连真漏改也放掉。
- **按显式标记豁免**（行内 `<!-- glossary-ok -->` 或墓碑块标记）：更准，代价是要维护标记。

**倾向显式标记；这条不定，不得改 blocking。**

**locale 缺陷的验收信号**：main CI 日志里的乱码候选实测为 `── （592 处）`、`── （622 处）`、`── 件号（3 处）`（`证件号` 被切成 `件号`），数百处命中淹掉真候选。修好 locale 后这三条应当消失——比「输出看起来正常」更可检，直接当验收信号。

**依赖关系不变**：**#27（术语检查扩到 issue 正文）仍 blocked by #29**（来源 https://github.com/a-RunShine/sunshine-hub/issues/27 ）——先让仓库内检查真能用，再扩到 issue 正文，顺序不能反。

> **行号更正（2026-11-17，`b987a6f`）**：上表「CI 里不 fail」行引的 `ci.yml:94-95` 是旧号；术语检查步骤现位移到 `ci.yml:99-100`（注释 `:97-98`），#33 新增的 `:94-95` 是链接检查，别对号。