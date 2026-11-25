import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { errorMessage } from '@/api/errors'
import { login } from '@/api/identity'
import { ActionButton } from '@/components/common/ActionButton'
import { TextField } from '@/components/common/FormField'
import { PasswordField } from '@/components/common/PasswordField'
import { validateLoginUsername, validateRequiredPassword } from '@/lib/authValidation'
import { buildRegisterPath, resolveNextPath } from '@/lib/redirect'
import { useFormFields } from '@/lib/useFormFields'
import { useAuth } from '@/stores/auth'
import { AuthCardShell } from './AuthCardShell'

function extractNotice(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) return null
  const notice = (state as Record<string, unknown>).notice
  return typeof notice === 'string' && notice.length > 0 ? notice : null
}

export default function LoginPage() {
  const setMe = useAuth((state) => state.setMe)
  const setStatus = useAuth((state) => state.setStatus)

  const location = useLocation()
  const navigate = useNavigate()
  const nextPath = resolveNextPath(location.search)
  const notice = extractNotice(location.state)

  const {
    values,
    fieldErrors,
    setFieldErrors,
    submitError,
    setSubmitError,
    submitting,
    setSubmitting,
    updateField,
  } = useFormFields({ username: '', password: '' })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const errors = {
      username: validateLoginUsername(values.username),
      password: validateRequiredPassword(values.password, '密码'),
    }
    setFieldErrors(errors)
    setSubmitError(null)
    if (errors.username !== null || errors.password !== null) return

    setSubmitting(true)
    try {
      const account = await login({
        username: values.username.trim(),
        password: values.password,
      })
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
    <AuthCardShell
      headingId="login-heading"
      eyebrow="SUNSHINE ACCESS"
      title="登录账号"
      subtitle="使用用户名与密码登录 Sunshine-FPS 官方商城"
      redirectTo={nextPath}
      notice={notice}
      footerPrompt="还没有账号？"
      footerLinkTo={buildRegisterPath(nextPath)}
      footerLinkLabel="去注册"
    >
      <form onSubmit={(event) => void handleSubmit(event)} noValidate className="flex flex-col gap-4">
        <TextField
          id="login-username"
          label="用户名"
          autoComplete="username"
          value={values.username}
          disabled={submitting}
          error={fieldErrors.username}
          onChange={(value) => updateField('username', value)}
        />

        <PasswordField
          id="login-password"
          label="密码"
          autoComplete="current-password"
          value={values.password}
          disabled={submitting}
          error={fieldErrors.password}
          onChange={(value) => updateField('password', value)}
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
    </AuthCardShell>
  )
}
