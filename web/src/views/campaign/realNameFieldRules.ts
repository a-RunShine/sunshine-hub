/**
 * 实名表单字段约束：单点镜像契约 `api/openapi.yaml` 的 `/me/real-name` 请求体
 * （`realName` maxLength: 32；`idNumber` pattern: `^\d{17}[\dXx]$`）。
 * 契约变更时同步本模块；弹窗校验只取这里，不在组件内另抄一份规则。
 */

/** 姓名长度上限，照契约 `realName` 的 maxLength。 */
export const REAL_NAME_MAX_LENGTH = 32

/** 证件号格式：17 位数字 + 1 位数字或 X/x，照契约 `idNumber` 的 pattern。 */
export const ID_NUMBER_PATTERN = /^\d{17}[\dXx]$/
