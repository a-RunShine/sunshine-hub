# AGENTS.md

本仓库是 Sunshine-FPS，一个虚构 FPS 游戏的官方商城。售卖虚拟道具和实体周边，另有公告与活动资讯。

## 技术栈

后端 Java 25、Spring Boot 3.5、MyBatis-Plus、MySQL 8、Redis 7、RocketMQ 5，构建用 Maven，测试用 JUnit 5 与 Testcontainers。

前端 React 18、Vite、TypeScript、Tailwind CSS、shadcn/ui，状态用 Zustand，测试用 Vitest。

## 项目文档

- 领域术语与排除词：`GLOSSARY.md`
- 架构决策：`docs/adr/`，改动涉及既有设计之前先扫一遍标题，标题本身就是结论
- 规格与实施计划不在仓库里，在 GitHub Issues：#2 是完整规格，#7 是实施路径
- 跨会话记忆：`docs/wiki/index.md`，**新会话先读它**。环境暗坑、工作方式约定、未结的环都在那层，仓库别处没写

## 改动纪律

删掉或改名一个领域概念时，全仓库搜旧词。范围不止代码：模型图、表结构、Redis 键、用户故事、issue 都要过。

概念改一半最要命，两种叫法并存，读的人不知道该信哪个，而旧的那个总是没人维护的那一半。漏一处，仓库里就留下一个不存在的概念，下一个 agent 会照着它实现。

`grep -rn` 能找到一半，判断哪个词算旧词靠人。命中之后逐条过，不是看一眼有没有命中就收工。

## 代码评审

评审任何 diff 之前，先读对应技术栈的规范：后端 `CODING_STANDARDS/java.md`，前端 `CODING_STANDARDS/typescript.md`。两边都动过就读两份。

那两份里全是机器判不了的判断题，能交给 CI 的一条都不在里面。不读它们，评审只能凭印象。

## Agent skills

### Issue tracker

Issues 和 spec 都存在 GitHub Issues 里，用 `gh` CLI 操作。详见 `docs/agents/issue-tracker.md`。

### Pull requests

PR 描述按三段模板写：Summary 给图或树、Evidence 给 before/after、Merge Danger 标单向门还是双向门。详见 `docs/agents/pull-requests.md`。

**push / 改正文前先查 PR 状态：** 跑 `scripts/pr-preflight.sh <pr-number>` 确认仍 OPEN，流程说明见 `docs/agents/pull-requests.md`。

**PR 开完即止，不要自己合并。** 合并必须等仓库所有者明确同意，一个字都别替他省。

**打标签不等于合并授权。** 代理可以给 issue 或 PR 使用仓库已有标签（如 `needs-triage`、`ready-for-agent`、`docs`）；新增标签仍按本文件的标签规则，不随意造。但 merge、关闭 PR、删除远端分支都必须等 owner 对**具体 PR** 明确同意。标签、review 结论、CI 全绿、“看起来没问题”都不是同意。

### Triage labels

五个状态角色用默认标签名，分类角色用 `bug` / `enhancement`；标签字符串与角色名一致。详见 `docs/agents/triage-labels.md`。

### Module labels

issue 归属哪个模块，用 `module:<name>` 标签标记，`<name>` 与代码模块目录同名，例如 `module:trade`、`module:catalog`。

模块只有四个：`identity`、`catalog`、`trade`、`content`，加一个 `shared`。划分依据是状态与事务的边界，不是功能数量也不是代码行数：`trade` 把订单、履约、支付、退款装在一起，因为它们推进同一个订单状态，拆开就是跨模块事务。

依赖方向只有一个：`trade → catalog`，反向禁止。商品不该知道怎么下单。

模块划分定下来之前不建这类标签。第一个模块落地时按模块名创建，此后每个 issue 至少带一个。跨模块的 issue 可以带多个；要拆 ticket 时，按模块边界拆。

### Type labels

`docs` 标记文档类的 issue：规范、ADR、术语表的改进与审查。纯代码改动不带它，只改注释也不算文档。

目前只有这一个类型标签。加新的之前先确认现有标签确实表达不了——标签一多，选标签的人就开始犹豫。

### Domain docs

单 context 布局：根目录 `GLOSSARY.md` 加 `docs/adr/`。详见 `docs/agents/domain.md`。
