import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ActionIntent = 'primary' | 'secondary' | 'link'

const INTENT_CLASSES: Record<ActionIntent, string> = {
  primary:
    'chamfer-cta inline-flex items-center justify-center gap-2 rounded-none bg-accent px-6 py-2.5 text-[14px] font-bold tracking-[0.03em] text-ink-950 transition-all hover:bg-[#f6c84f] disabled:cursor-not-allowed disabled:opacity-50',
  secondary:
    'inline-flex items-center justify-center gap-2 rounded-[2px] border border-line bg-ink-900 px-5 py-2 text-[13px] font-medium text-foreground transition-colors hover:border-accent/60 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50',
  link:
    'inline-flex items-center gap-1.5 border-b border-line pb-0.5 text-[13px] font-medium text-foreground transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50',
}

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly intent?: ActionIntent
  readonly children: ReactNode
}

export function ActionButton({
  intent = 'primary',
  className,
  type = 'button',
  children,
  ...props
}: ActionButtonProps) {
  if (intent === 'link') {
    return (
      <button type={type} className={cn(INTENT_CLASSES.link, className)} {...props}>
        {children}
      </button>
    )
  }

  return (
    <Button
      type={type}
      variant={intent === 'primary' ? 'default' : 'outline'}
      className={cn(
        'h-auto shadow-none',
        intent === 'primary' ? INTENT_CLASSES.primary : INTENT_CLASSES.secondary,
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  )
}

interface ActionLinkProps extends LinkProps {
  readonly intent?: ActionIntent
  readonly children: ReactNode
}

export function ActionLink({ intent = 'primary', className, children, ...props }: ActionLinkProps) {
  return (
    <Link className={cn(INTENT_CLASSES[intent], className)} {...props}>
      {children}
    </Link>
  )
}
