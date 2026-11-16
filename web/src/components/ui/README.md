# shadcn 组件目录

`src/components/ui/` 放从 shadcn CLI 拷进来的源码，直接使用，**不要手改**。

理由和做法见 `CODING_STANDARDS/typescript.md`「shadcn 的组件不改源码，要定制就包一层」：

- 需要改行为时，在同一层（或上一层）新建自己的组件包住它，定制写在外层。
- 直接改源码，下次 CLI 加新组件会覆盖同名文件，改动静默消失。

目前目录是空的，等页面用到第一个组件时再执行 `pnpm dlx shadcn@latest add <name>`。
