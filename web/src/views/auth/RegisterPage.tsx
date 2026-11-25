import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { errorMessage } from '@/api/errors'
import { register } from '@/api/identity'
import { ActionButton, ActionLink } from '@/components/common/ActionButton'
import { DiagonalSurface } from '@/components/common/DiagonalSurface'
import { PageState } from '@/components/common/PageState'
import { PasswordField } from '@/components/common/PasswordField'
import {
  PASSWORD_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  validateConfirmPassword,
  validateNewPassword,
  validateRegisterUsername,
} from '@/lib/authValidation'
import { buildLoginPath, resolveNextPath } from '@/lib/redirect'
import { cn } from '@/lib/utils'
import { useAuth } from '@/stores/auth'

interface RegisterFieldErrors {
  username: string | null
  password: string | null
  confirmPassword: string | null
}

export default function RegisterPage() {
  const me = useAuth((state) => state.me)
  const status = useAuth((state) => state.status)
  const setMe = useAuth((state) => state.setMe)
  const setStatus = useAuth((state) => state.setStatus)
  const setAuthNotice = useAuth((state) => state.setAuthNotice)

  const location = useLocation()
  const navigate = useNavigate()
  const nextPath = resolveNextPath(location.search)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({
    username: null,
    password: null,
    confirmPassword: null,
  })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (me !== null) {
    return <Navigate to={nextPath} replace />
  }

  if (status === 'loading') {
    return (
      <div className="mx-auto flex w-full max-w-[440px] justify-center py-12">
        <PageState variant="loading" />
      </div>
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const errors: RegisterFieldErrors = {
      username: validateRegisterUsername(username),
      password: validateNewPassword(password),
      confirmPassword: validateConfirmPassword(password, confirmPassword, '请再次输入密码'),
    }
    setFieldErrors(errors)
    setSubmitError(null)
    if (
      errors.username !== null ||
      errors.password !== null ||
      errors.confirmPassword !== null
    ) {
      return
    }

    setSubmitting(true)
    try {
      const account = await register({ username: username.trim(), password })
      setAuthNotice(null)
      setMe(account)
      setStatus('ready')
      navigate(nextPath, { replace: true })
    } catch (error) {
      setSubmitError(errorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      aria-labelledby="register-heading"
      className="mx-auto flex w-full max-w-[440px] flex-col py-8 sm:py-12"
    >
      <div className="relative overflow-hidden rounded-[2px] border border-line border-t-2 border-t-accent bg-ink-900 p-6 sm:p-8">
        <DiagonalSurface variant="card" />

        <div className="relative z-[2] flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold tracking-[0.14em] text-accent">
              NEW ACCOUNT
            </span>
            <h1 id="register-heading" className="text-[24px] font-bold tracking-[-0.015em] text-foreground">
              注册账号
            </h1>
            <p className="text-[13px] text-muted">仅需设置用户名与密码即可完成注册</p>
          </div>

          <form onSubmit={(event) => void handleSubmit(event)} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="register-username" className="text-[13px] font-medium text-foreground">
                用户名
              </label>
              <input
                id="register-username"
                type="text"
                autoComplete="username"
                maxLength={USERNAME_MAX_LENGTH}
                value={username}
                disabled={submitting}
                aria-invalid={fieldErrors.username !== null ? 'true' : undefined}
                aria-describedby={
                  fieldErrors.username !== null
                    ? 'register-username-hint register-username-error'
                    : 'register-username-hint'
                }
                onChange={(event) => {
                  setUsername(event.target.value)
                  if (fieldErrors.username !== null) {
                    setFieldErrors((prev) => ({ ...prev, username: null }))
                  }
                  if (submitError !== null) setSubmitError(null)
                }}
                className={cn(
                  'w-full rounded-[2px] border bg-ink-950 px-3 py-2.5 text-[16px] text-foreground outline-none transition-colors placeholder:text-muted/70 disabled:opacity-50 sm:text-sm',
                  fieldErrors.username !== null
                    ? 'border-danger focus:border-danger'
                    : 'border-line focus:border-accent',
                )}
              />
              <p id="register-username-hint" className="text-[12px] text-muted">
                3–32 个字符，仅支持字母、数字和下划线
              </p>
              {fieldErrors.username !== null && (
                <p id="register-username-error" className="text-[13px] text-danger">
                  {fieldErrors.username}
                </p>
              )}
            </div>

            <PasswordField
              id="register-password"
              label="密码"
              autoComplete="new-password"
              maxLength={PASSWORD_MAX_LENGTH}
              hint="8–64 个字符"
              value={password}
              disabled={submitting}
              error={fieldErrors.password}
              onChange={(value) => {
                setPassword(value)
                if (fieldErrors.password !== null) {
                  setFieldErrors((prev) => ({ ...prev, password: null }))
                }
                if (submitError !== null) setSubmitError(null)
              }}
            />

            <PasswordField
              id="register-confirm-password"
              label="确认密码"
              autoComplete="new-password"
              maxLength={PASSWORD_MAX_LENGTH}
              value={confirmPassword}
              disabled={submitting}
              error={fieldErrors.confirmPassword}
              onChange={(value) => {
                setConfirmPassword(value)
                if (fieldErrors.confirmPassword !== null) {
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: null }))
                }
                if (submitError !== null) setSubmitError(null)
              }}
            />

            {submitError !== null && (
              <p role="alert" className="text-[13px] text-danger">
                {submitError}
              </p>
            )}

            <ActionButton type="submit" intent="primary" disabled={submitting} className="mt-1 w-full">
              {submitting ? '注册中…' : '注册'}
            </ActionButton>
          </form>

          <div className="flex items-center justify-between border-t border-line pt-4 text-[13px] text-muted">
            <span>已有账号？</span>
            <ActionLink to={buildLoginPath(nextPath)} intent="link">
              去登录
            </ActionLink>
          </div>
        </div>
      </div>
    </section>
  )
}
