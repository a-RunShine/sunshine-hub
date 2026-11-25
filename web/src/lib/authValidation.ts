export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 32
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 64

export function validateLoginUsername(username: string): string | null {
  if (username.trim() === '') return '请输入用户名'
  return null
}

export function validateRegisterUsername(username: string): string | null {
  const trimmed = username.trim()
  if (trimmed === '') return '请输入用户名'
  if (trimmed.length < USERNAME_MIN_LENGTH || trimmed.length > USERNAME_MAX_LENGTH) {
    return `用户名需为 ${USERNAME_MIN_LENGTH} 到 ${USERNAME_MAX_LENGTH} 个字符`
  }
  if (!USERNAME_PATTERN.test(trimmed)) {
    return '用户名仅支持字母、数字和下划线'
  }
  return null
}

export function validateRequiredPassword(password: string, label = '密码'): string | null {
  if (password.length === 0) return `请输入${label}`
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `${label}最长 ${PASSWORD_MAX_LENGTH} 个字符`
  }
  return null
}

export function validateNewPassword(
  password: string,
  options?: { readonly currentPassword?: string; readonly label?: string },
): string | null {
  const label = options?.label ?? '密码'
  if (password.length === 0) return `请输入${label}`
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return `${label}需为 ${PASSWORD_MIN_LENGTH} 到 ${PASSWORD_MAX_LENGTH} 个字符`
  }
  if (options?.currentPassword !== undefined && password === options.currentPassword) {
    return '新密码不能与当前密码相同'
  }
  return null
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string,
  emptyMessage = '请再次输入密码',
): string | null {
  if (confirmPassword.length === 0) return emptyMessage
  if (confirmPassword !== password) return '两次输入的密码不一致'
  return null
}
