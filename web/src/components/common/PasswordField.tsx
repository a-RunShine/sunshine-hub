import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { FormField, fieldInputClassName } from './FormField'

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

  return (
    <FormField id={id} label={label} error={error} hint={hint}>
      {(inputProps) => (
        <div className="relative">
          <input
            {...inputProps}
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            autoComplete={autoComplete}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            className={fieldInputClassName(error !== null, 'pr-10')}
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
      )}
    </FormField>
  )
}
