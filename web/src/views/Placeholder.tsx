interface Props {
  title: string
  note?: string
}

/**
 * 骨架阶段的占位页。
 * 每个页面在各自的 ticket 里替换成真实实现，这里只保证路由通、构建过。
 */
export default function Placeholder({ title, note }: Props) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6">
      <h1 className="text-2xl font-medium tracking-tight text-foreground">{title}</h1>
      <p className="mt-3 text-sm text-muted">
        {note ?? '这个页面还没实现，先占住路由。'}
      </p>
    </main>
  )
}
