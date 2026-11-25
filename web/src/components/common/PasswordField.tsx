import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PasswordFieldProps {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
  readonly error?: string | null
  readonly autoComplete?: string
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly maxLength?: number
  readonly hint?: string
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  error = null,
  autoComplete,
  placeholder,
  disabled = false,
  maxLength,
  hint,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error !== null ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          aria-invalid={error !== null ? 'true' : undefined}
          aria-describedby={describedBy}
          className={cn(
            'w-full rounded-[2px] border bg-ink-950 py-2.5 pl-3 pr-10 text-[16px] text-foreground outline-none transition-colors placeholder:text-muted/70 disabled:opacity-50 sm:text-sm',
            error !== null ? 'border-danger focus:border-danger' : 'border-line focus:border-accent',
          )}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          disabled={disabled}
          aria-label={visible ? `隐藏${label}` : `显示${label}`}
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[2px] text-muted transition-colors hover:text-foreground disabled:opacity-50"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {hint && (
        <p id={hintId} className="text-[12px] text-muted">
          {hint}
        </p>
      )}
      {error !== null && (
        <p id={errorId} className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
