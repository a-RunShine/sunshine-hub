import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { errorMessage } from '@/api/errors'
import { login } from '@/api/identity'
import { ActionButton, ActionLink } from '@/components/common/ActionButton'
import { DiagonalSurface } from '@/components/common/DiagonalSurface'
import { PageState } from '@/components/common/PageState'
import { PasswordField } from '@/components/common/PasswordField'
import { validateLoginPassword, validateLoginUsername } from '@/lib/authValidation'
import { buildRegisterPath, resolveNextPath } from '@/lib/redirect'
import { cn } from '@/lib/utils'
import { useAuth } from '@/stores/auth'

interface LoginFieldErrors {
  username: string | null
  password: string | null
}

export default function LoginPage() {
  const me = useAuth((state) => state.me)
  const status = useAuth((state) => state.status)
  const authNotice = useAuth((state) => state.authNotice)
  const setMe = useAuth((state) => state.setMe)
  const setStatus = useAuth((state) => state.setStatus)
  const setAuthNotice = useAuth((state) => state.setAuthNotice)

  const location = useLocation()
  const navigate = useNavigate()
  const nextPath = resolveNextPath(location.search)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({
    username: null,
    password: null,
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

    const errors: LoginFieldErrors = {
      username: validateLoginUsername(username),
      password: validateLoginPassword(password),
    }
    setFieldErrors(errors)
    setSubmitError(null)
    if (errors.username !== null || errors.password !== null) return

    setSubmitting(true)
    try {
      const account = await login({ username: username.trim(), password })
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
      aria-labelledby="login-heading"
      className="mx-auto flex w-full max-w-[440px] flex-col py-8 sm:py-12"
    >
      <div className="relative overflow-hidden rounded-[2px] border border-line border-t-2 border-t-accent bg-ink-900 p-6 sm:p-8">
        <DiagonalSurface variant="card" />

        <div className="relative z-[2] flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold tracking-[0.14em] text-accent">
              SUNSHINE ACCESS
            </span>
            <h1 id="login-heading" className="text-[24px] font-bold tracking-[-0.015em] text-foreground">
              登录账号
            </h1>
            <p className="text-[13px] text-muted">使用用户名与密码登录 Sunshine-FPS 官方商城</p>
          </div>

          {authNotice !== null && (
            <div
              role="status"
              className="rounded-[2px] border border-accent/40 bg-accent/10 px-3.5 py-2.5 text-[13px] text-foreground"
            >
              {authNotice}
            </div>
          )}

          <form onSubmit={(event) => void handleSubmit(event)} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-username" className="text-[13px] font-medium text-foreground">
                用户名
              </label>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                value={username}
                disabled={submitting}
                aria-invalid={fieldErrors.username !== null ? 'true' : undefined}
                aria-describedby={fieldErrors.username !== null ? 'login-username-error' : undefined}
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
              {fieldErrors.username !== null && (
                <p id="login-username-error" className="text-[13px] text-danger">
                  {fieldErrors.username}
                </p>
              )}
            </div>

            <PasswordField
              id="login-password"
              label="密码"
              autoComplete="current-password"
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

            {submitError !== null && (
              <p role="alert" className="text-[13px] text-danger">
                {submitError}
              </p>
            )}

            <ActionButton type="submit" intent="primary" disabled={submitting} className="mt-1 w-full">
              {submitting ? '登录中…' : '登录'}
            </ActionButton>
          </form>

          <div className="flex items-center justify-between border-t border-line pt-4 text-[13px] text-muted">
            <span>还没有账号？</span>
            <ActionLink
              to={buildRegisterPath(nextPath)}
              intent="link"
              onClick={() => setAuthNotice(null)}
            >
              去注册
            </ActionLink>
          </div>
        </div>
      </div>
    </section>
  )
}
