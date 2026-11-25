import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { ActionLink } from '@/components/common/ActionButton'
import { DiagonalSurface } from '@/components/common/DiagonalSurface'
import { PageState } from '@/components/common/PageState'
import { useAuth } from '@/stores/auth'

interface AuthCardShellProps {
  readonly headingId: string
  readonly eyebrow: string
  readonly title: string
  readonly subtitle: string
  readonly redirectTo: string
  readonly notice?: string | null
  readonly footerPrompt: string
  readonly footerLinkTo: string
  readonly footerLinkLabel: string
  readonly children: ReactNode
}

export function AuthCardShell({
  headingId,
  eyebrow,
  title,
  subtitle,
  redirectTo,
  notice = null,
  footerPrompt,
  footerLinkTo,
  footerLinkLabel,
  children,
}: AuthCardShellProps) {
  const me = useAuth((state) => state.me)
  const status = useAuth((state) => state.status)

  if (me !== null) {
    return <Navigate to={redirectTo} replace />
  }

  if (status === 'loading') {
    return (
      <div className="mx-auto flex w-full max-w-[440px] justify-center py-12">
        <PageState variant="loading" />
      </div>
    )
  }

  return (
    <section
      aria-labelledby={headingId}
      className="mx-auto flex w-full max-w-[440px] flex-col py-8 sm:py-12"
    >
      <div className="relative overflow-hidden rounded-[2px] border border-line border-t-2 border-t-accent bg-ink-900 p-6 sm:p-8">
        <DiagonalSurface variant="card" />

        <div className="relative z-[2] flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold tracking-[0.14em] text-accent">
              {eyebrow}
            </span>
            <h1 id={headingId} className="text-[24px] font-bold tracking-[-0.015em] text-foreground">
              {title}
            </h1>
            <p className="text-[13px] text-muted">{subtitle}</p>
          </div>

          {notice !== null && (
            <div
              role="status"
              className="rounded-[2px] border border-accent/40 bg-accent/10 px-3.5 py-2.5 text-[13px] text-foreground"
            >
              {notice}
            </div>
          )}

          {children}

          <div className="flex items-center justify-between border-t border-line pt-4 text-[13px] text-muted">
            <span>{footerPrompt}</span>
            <ActionLink to={footerLinkTo} intent="link">
              {footerLinkLabel}
            </ActionLink>
          </div>
        </div>
      </div>
    </section>
  )
}
