import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { errorMessage } from '@/api/errors'
import { register } from '@/api/identity'
import { ActionButton } from '@/components/common/ActionButton'
import { TextField } from '@/components/common/FormField'
import { PasswordField } from '@/components/common/PasswordField'
import {
  PASSWORD_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  validateConfirmPassword,
  validateNewPassword,
  validateRegisterUsername,
} from '@/lib/authValidation'
import { buildLoginPath, resolveNextPath } from '@/lib/redirect'
import { useFormFields } from '@/lib/useFormFields'
import { useAuth } from '@/stores/auth'
import { AuthCardShell } from './AuthCardShell'

export default function RegisterPage() {
  const setMe = useAuth((state) => state.setMe)
  const setStatus = useAuth((state) => state.setStatus)

  const location = useLocation()
  const navigate = useNavigate()
  const nextPath = resolveNextPath(location.search)

  const {
    values,
    fieldErrors,
    setFieldErrors,
    submitError,
    setSubmitError,
    submitting,
    setSubmitting,
    updateField,
  } = useFormFields({ username: '', password: '', confirmPassword: '' })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const errors = {
      username: validateRegisterUsername(values.username),
      password: validateNewPassword(values.password),
      confirmPassword: validateConfirmPassword(
        values.password,
        values.confirmPassword,
        '请再次输入密码',
      ),
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
      const account = await register({
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
      headingId="register-heading"
      eyebrow="NEW ACCOUNT"
      title="注册账号"
      subtitle="仅需设置用户名与密码即可完成注册"
      redirectTo={nextPath}
      footerPrompt="已有账号？"
      footerLinkTo={buildLoginPath(nextPath)}
      footerLinkLabel="去登录"
    >
      <form onSubmit={(event) => void handleSubmit(event)} noValidate className="flex flex-col gap-4">
        <TextField
          id="register-username"
          label="用户名"
          autoComplete="username"
          maxLength={USERNAME_MAX_LENGTH}
          hint="3–32 个字符，仅支持字母、数字和下划线"
          value={values.username}
          disabled={submitting}
          error={fieldErrors.username}
          onChange={(value) => updateField('username', value)}
        />

        <PasswordField
          id="register-password"
          label="密码"
          autoComplete="new-password"
          maxLength={PASSWORD_MAX_LENGTH}
          hint="8–64 个字符"
          value={values.password}
          disabled={submitting}
          error={fieldErrors.password}
          onChange={(value) => updateField('password', value)}
        />

        <PasswordField
          id="register-confirm-password"
          label="确认密码"
          autoComplete="new-password"
          maxLength={PASSWORD_MAX_LENGTH}
          value={values.confirmPassword}
          disabled={submitting}
          error={fieldErrors.confirmPassword}
          onChange={(value) => updateField('confirmPassword', value)}
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
    </AuthCardShell>
  )
}
