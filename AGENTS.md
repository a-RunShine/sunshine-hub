# AGENTS.md

本仓库是 Sunshine-FPS，一个虚构 FPS 游戏的官方商城。售卖虚拟道具和实体周边，另有公告与活动资讯。

## 技术栈

后端 Java 25、Spring Boot 3.5、MyBatis-Plus、MySQL 8、Redis 7、RocketMQ 5，构建用 Maven，测试用 JUnit 5 与 Testcontainers。

前端 React 18、Vite、TypeScript、Tailwind CSS、shadcn/ui，状态用 Zustand，测试用 Vitest。

## 代码评审

评审或验收改动时，按 `CODING_STANDARDS.md` 逐条过。那份文档写的是「在 diff 里看到什么该退回」，不是「怎么写代码」，别拿它当教程用。

## Agent skills

### Issue tracker

Issues 和 spec 都存在 GitHub Issues 里，用 `gh` CLI 操作。详见 `docs/agents/issue-tracker.md`。

### Triage labels

五个 triage 角色用默认标签名，标签字符串与角色名一致。详见 `docs/agents/triage-labels.md`。

### Module labels

issue 归属哪个模块，用 `module:<name>` 标签标记，`<name>` 与代码模块目录同名，例如 `module:order`、`module:inventory`。

模块划分定下来之前不建这类标签。第一个模块落地时按模块名创建，此后每个 issue 至少带一个。跨模块的 issue 可以带多个；要拆 ticket 时，按模块边界拆。

### Domain docs

单 context 布局：根目录 `GLOSSARY.md` 加 `docs/adr/`。详见 `docs/agents/domain.md`。
