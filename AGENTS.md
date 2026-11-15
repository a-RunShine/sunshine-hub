# AGENTS.md

本仓库是「典藏发售」，限量编号藏品的限时发售系统。技术栈为 Spring Boot、MySQL、Redis、RocketMQ。

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
