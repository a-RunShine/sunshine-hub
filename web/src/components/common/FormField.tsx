import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  readonly id: string
  readonly label: string
  readonly error?: string | null
  readonly hint?: string
  readonly children: (inputProps: {
    readonly id: string
    readonly 'aria-invalid'?: 'true'
    readonly 'aria-describedby'?: string
  }) => ReactNode
}

export function fieldInputClassName(hasError: boolean, extra?: string): string {
  return cn(
    'w-full rounded-[2px] border bg-ink-950 px-3 py-2.5 text-[16px] text-foreground outline-none transition-colors placeholder:text-muted/70 disabled:opacity-50 sm:text-sm',
    hasError ? 'border-danger focus:border-danger' : 'border-line focus:border-accent',
    extra,
  )
}

export function FormField({ id, label, error = null, hint, children }: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error !== null ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-foreground">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': error !== null ? 'true' : undefined,
        'aria-describedby': describedBy,
      })}
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

interface TextFieldProps {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
  readonly error?: string | null
  readonly type?: 'text' | 'email'
  readonly autoComplete?: string
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly maxLength?: number
  readonly hint?: string
}

export function TextField({
  id,
  label,
  value,
  onChange,
  error = null,
  type = 'text',
  autoComplete,
  placeholder,
  disabled = false,
  maxLength,
  hint,
}: TextFieldProps) {
  return (
    <FormField id={id} label={label} error={error} hint={hint}>
      {(inputProps) => (
        <input
          {...inputProps}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className={fieldInputClassName(error !== null)}
        />
      )}
    </FormField>
  )
}
