import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { errorMessage } from '@/api/errors'
import { changePassword } from '@/api/identity'
import { ActionButton } from '@/components/common/ActionButton'
import { PasswordField } from '@/components/common/PasswordField'
import { SectionHeader } from '@/components/common/SectionHeader'
import {
  PASSWORD_MAX_LENGTH,
  validateConfirmPassword,
  validateNewPassword,
  validateRequiredPassword,
} from '@/lib/authValidation'
import { buildLoginUrl } from '@/lib/redirect'
import { useFormFields } from '@/lib/useFormFields'
import { useAuth } from '@/stores/auth'

export default function SettingsPage() {
  const me = useAuth((state) => state.me)
  const setMe = useAuth((state) => state.setMe)
  const setStatus = useAuth((state) => state.setStatus)

  const location = useLocation()
  const navigate = useNavigate()

  const {
    values,
    fieldErrors,
    setFieldErrors,
    submitError,
    setSubmitError,
    submitting,
    setSubmitting,
    updateField,
  } = useFormFields({ currentPassword: '', newPassword: '', confirmNewPassword: '' })

  if (me === null) return null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const errors = {
      currentPassword: validateRequiredPassword(values.currentPassword, '当前密码'),
      newPassword: validateNewPassword(values.newPassword, {
        currentPassword: values.currentPassword,
        label: '新密码',
      }),
      confirmNewPassword: validateConfirmPassword(
        values.newPassword,
        values.confirmNewPassword,
        '请再次输入新密码',
      ),
    }
    setFieldErrors(errors)
    setSubmitError(null)
    if (
      errors.currentPassword !== null ||
      errors.newPassword !== null ||
      errors.confirmNewPassword !== null
    ) {
      return
    }

    setSubmitting(true)
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      navigate(buildLoginUrl(location), {
        replace: true,
        state: { notice: '密码已修改，请用新密码重新登录' },
      })
      setMe(null)
      setStatus('ready')
    } catch (error) {
      setSubmitError(errorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader as="h1" title="账号设置" />

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="设置分类" className="flex flex-col gap-1">
          <div
            aria-current="page"
            className="rounded-[2px] border border-line border-l-2 border-l-accent bg-ink-900 px-4 py-3 text-[14px] font-semibold text-accent"
          >
            账号安全
          </div>
        </nav>

        <div className="flex flex-col gap-6">
          <section
            aria-labelledby="account-summary-heading"
            className="rounded-[2px] border border-line bg-ink-900 p-6"
          >
            <h2 id="account-summary-heading" className="text-[18px] font-semibold text-foreground">
              账号信息
            </h2>

            <dl className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
              <div>
                <dt className="text-[12px] text-muted">用户名</dt>
                <dd className="mt-1 font-mono text-[15px] font-medium text-foreground">
                  {me.username}
                </dd>
              </div>

              <div>
                <dt className="text-[12px] text-muted">实名状态</dt>
                <dd className="mt-1 flex flex-wrap items-center gap-2 text-[14px] text-foreground">
                  {me.realNameVerified ? (
                    <>
                      <span className="rounded-[2px] border border-accent/40 bg-accent/10 px-2 py-0.5 text-[12px] font-medium text-accent">
                        已实名
                      </span>
                      {me.realName && <span>{me.realName}</span>}
                      {me.idNumberTail && (
                        <span className="font-mono text-[13px] text-muted">
                          尾号 {me.idNumberTail}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="rounded-[2px] border border-line bg-ink-950 px-2 py-0.5 text-[12px] font-medium text-muted">
                      未实名
                    </span>
                  )}
                </dd>
                {!me.realNameVerified && (
                  <p className="mt-2 text-[12px] text-muted">
                    参与限时抢购时再按提示完成实名认证，此处仅展示当前状态。
                  </p>
                )}
              </div>
            </dl>
          </section>

          <section
            aria-labelledby="change-password-heading"
            className="rounded-[2px] border border-line border-t-2 border-t-accent bg-ink-900 p-6"
          >
            <div className="flex flex-col gap-1">
              <h2 id="change-password-heading" className="text-[18px] font-semibold text-foreground">
                修改密码
              </h2>
              <p className="text-[13px] text-muted">
                修改后该账号的所有已登录会话会立即作废，需要重新登录。
              </p>
            </div>

            <form
              onSubmit={(event) => void handleSubmit(event)}
              noValidate
              className="mt-5 flex max-w-md flex-col gap-4"
            >
              <PasswordField
                id="settings-current-password"
                label="当前密码"
                autoComplete="current-password"
                maxLength={PASSWORD_MAX_LENGTH}
                value={values.currentPassword}
                disabled={submitting}
                error={fieldErrors.currentPassword}
                onChange={(value) => updateField('currentPassword', value)}
              />

              <PasswordField
                id="settings-new-password"
                label="新密码"
                autoComplete="new-password"
                maxLength={PASSWORD_MAX_LENGTH}
                hint="8–64 个字符，不能与当前密码相同"
                value={values.newPassword}
                disabled={submitting}
                error={fieldErrors.newPassword}
                onChange={(value) => updateField('newPassword', value)}
              />

              <PasswordField
                id="settings-confirm-new-password"
                label="确认新密码"
                autoComplete="new-password"
                maxLength={PASSWORD_MAX_LENGTH}
                value={values.confirmNewPassword}
                disabled={submitting}
                error={fieldErrors.confirmNewPassword}
                onChange={(value) => updateField('confirmNewPassword', value)}
              />

              {submitError !== null && (
                <p role="alert" className="text-[13px] text-danger">
                  {submitError}
                </p>
              )}

              <div className="pt-1">
                <ActionButton type="submit" intent="primary" disabled={submitting}>
                  {submitting ? '提交中…' : '确认修改'}
                </ActionButton>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
