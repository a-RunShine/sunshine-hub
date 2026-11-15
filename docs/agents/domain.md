# Domain Docs

工程类 skill 在探索这个仓库之前，怎么消费这里的领域文档。

## 探索之前先读

- 根目录的 **`GLOSSARY.md`**，或者
- 根目录的 **`GLOSSARY-MAP.md`**（如果存在）：它指向每个 context 各自的 `GLOSSARY.md`，读与当前话题相关的那些
- **`docs/adr/`**：读和你要动的区域相关的 ADR。多 context 仓库里还要看 `src/<context>/docs/adr/`

这些文件不存在就直接往下走，不要提示，也不要建议先建。术语和决策是 `/domain-modeling` 在实际产生时才落盘的。

## 目录结构

单 context 仓库（大多数仓库，包括这个）：

```
/
├── GLOSSARY.md
├── docs/adr/
└── src/
```

多 context 仓库（根目录有 `GLOSSARY-MAP.md`）：

```
/
├── GLOSSARY-MAP.md
├── docs/adr/                          ← 系统级决策
└── src/
    ├── ordering/
    │   ├── GLOSSARY.md
    │   └── docs/adr/                  ← context 内决策
    └── billing/
        ├── GLOSSARY.md
        └── docs/adr/
```

## 用术语表里的词

输出里出现领域概念时（issue 标题、重构提案、假设、测试名），用 `GLOSSARY.md` 里定义的词，不要漂移到 `_Avoid_` 里明确排除的同义词。

需要的概念不在表里，这是个信号：要么你在发明项目里根本不用的语言（重新想一下），要么确实有缺口（记下来交给 `/domain-modeling`）。

## ADR 冲突要显式提出

输出和现有 ADR 矛盾时，明说，不要悄悄覆盖：

> _与 ADR-0007（事件溯源订单）冲突，但值得重开，因为……_
