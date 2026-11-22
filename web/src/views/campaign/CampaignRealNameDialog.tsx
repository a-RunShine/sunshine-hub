import { useEffect, useState, type FormEvent } from 'react'
import type { RealNameInput } from '@/api/identity'
import { ActionButton } from '@/components/common/ActionButton'
import { ID_NUMBER_PATTERN, REAL_NAME_MAX_LENGTH } from './realNameFieldRules'

interface CampaignRealNameDialogProps {
  readonly open: boolean
  readonly submitting: boolean
  readonly error: string | null
  readonly onSubmit: (input: RealNameInput) => void
  readonly onCancel: () => void
}

interface FieldError {
  realName: string | null
  idNumber: string | null
}

export function CampaignRealNameDialog({
  open,
  submitting,
  error,
  onSubmit,
  onCancel,
}: CampaignRealNameDialogProps) {
  const [realName, setRealName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [fieldError, setFieldError] = useState<FieldError>({ realName: null, idNumber: null })

  useEffect(() => {
    if (open) {
      setRealName('')
      setIdNumber('')
      setFieldError({ realName: null, idNumber: null })
    }
  }, [open])

  if (!open) return null

  const validate = (): boolean => {
    const trimmedName = realName.trim()
    const errors: FieldError = { realName: null, idNumber: null }
    if (trimmedName === '') {
      errors.realName = '请填写购买人姓名'
    } else if (trimmedName.length > REAL_NAME_MAX_LENGTH) {
      errors.realName = `姓名最长 ${REAL_NAME_MAX_LENGTH} 个字符`
    }
    if (!ID_NUMBER_PATTERN.test(idNumber.trim())) {
      errors.idNumber = '请填写 18 位证件号（末位可为 X）'
    }
    setFieldError(errors)
    return errors.realName === null && errors.idNumber === null
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting || !validate()) return
    onSubmit({ realName: realName.trim(), idNumber: idNumber.trim() })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="完成实名认证"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onCancel()
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-[2px] border border-line border-t-2 border-t-accent bg-[#131715] px-6 py-6 shadow-[0_24px_48px_rgba(0,0,0,0.72)]"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">完成实名认证</h2>
            <p className="mt-1 text-sm text-muted">提交后自动继续刚才的抢购，无需再次点击。</p>
          </div>
          <button
            type="button"
            aria-label="关闭"
            disabled={submitting}
            onClick={onCancel}
            className="text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <label className="flex flex-col gap-1.5 text-sm text-foreground" htmlFor="real-name">
          购买人姓名
          <input
            id="real-name"
            type="text"
            value={realName}
            maxLength={REAL_NAME_MAX_LENGTH}
            autoComplete="name"
            disabled={submitting}
            onChange={(event) => setRealName(event.target.value)}
            className="rounded-[2px] border border-line bg-ink-950 px-3 py-2 text-[16px] text-foreground outline-none transition-colors focus:border-accent sm:text-sm"
          />
        </label>
        {fieldError.realName !== null && <p className="text-sm text-red-400">{fieldError.realName}</p>}

        <label className="flex flex-col gap-1.5 text-sm text-foreground" htmlFor="id-number">
          证件号
          <input
            id="id-number"
            type="text"
            value={idNumber}
            autoComplete="off"
            disabled={submitting}
            onChange={(event) => setIdNumber(event.target.value)}
            className="rounded-[2px] border border-line bg-ink-950 px-3 py-2 text-[16px] text-foreground outline-none transition-colors focus:border-accent sm:text-sm"
          />
        </label>
        {fieldError.idNumber !== null && <p className="text-sm text-red-400">{fieldError.idNumber}</p>}

        {error !== null && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <ActionButton intent="secondary" disabled={submitting} onClick={onCancel}>
            放弃
          </ActionButton>
          <ActionButton type="submit" intent="primary" disabled={submitting}>
            {submitting ? '提交中…' : '提交并继续抢购'}
          </ActionButton>
        </div>
      </form>
    </div>
  )
}
