import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { scenarios } from './scenarios'

/**
 * 契约覆盖测试：把 OpenAPI 里两个 in-scope operation（claim、POST /orders）
 * 声明的错误码，与 mock 场景表能产出的错误码对齐。
 * - 用真实 YAML parser 解析 api/openapi.yaml；
 * - 共享 401 / 429 响应是 `$ref`，必须显式跟进去拿 description，不能静默跳过；
 * - 只覆盖 claim 与 /orders，GET 详情 404 等其它接口不在本 ticket 范围。
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const openapiPath = path.resolve(here, '../../../api/openapi.yaml')

interface ResponseDescription {
  description?: string
}

interface RefNode {
  $ref: string
}

type ResponseNode = ResponseDescription | RefNode

type OpenApiResponses = Record<string, ResponseNode>

interface OpenApiDoc {
  paths: Record<string, { post: { responses: OpenApiResponses } }>
  components: { responses: Record<string, ResponseDescription> }
}

const openapi = parse(readFileSync(openapiPath, 'utf8')) as OpenApiDoc

function resolveResponse(node: ResponseNode): ResponseDescription {
  if ('$ref' in node) {
    const parts = node.$ref.replace(/^#\//, '').split('/')
    let cursor: unknown = openapi
    for (const part of parts) {
      cursor = (cursor as Record<string, unknown>)[part]
    }
    return cursor as ResponseDescription
  }
  return node
}

/** 从 description 文本里抽 `code：`（全角冒号）或 `code:`（半角冒号）后面声明的错误码列表。 */
function extractCodes(description: string | undefined): string[] {
  if (!description) return []
  const codes = new Set<string>()
  for (const match of description.matchAll(/code[：:]([^\n]*)/g)) {
    for (const token of match[1].split(/[、,，\s]+/)) {
      if (/^[A-Z][A-Z0-9_]+$/.test(token)) codes.add(token)
    }
  }
  return [...codes]
}

function declaredCodes(responses: OpenApiResponses, operation: string): string[] {
  const codes = new Set<string>()
  for (const node of Object.values(responses)) {
    for (const code of extractCodes(resolveResponse(node).description)) {
      codes.add(code)
    }
  }
  // 契约里某个 in-scope operation 一个码都没解析出来，说明 description 写法变了而正则没跟上，
  // 必须当场失败，不能让空数组静默通过后续循环。
  expect(
    codes.size,
    `契约 operation「${operation}」未解析出任何错误码，请核对 description 里的 code 声明格式`,
  ).toBeGreaterThan(0)
  return [...codes]
}

const claimResponses = openapi.paths['/campaigns/{campaignId}/claim'].post.responses
const orderResponses = openapi.paths['/orders'].post.responses

const claimScenarioCodes = new Set(
  scenarios.map((scenario) => scenario.claimFailure?.code).filter((code): code is string => Boolean(code)),
)
const orderScenarioCodes = new Set(
  scenarios.map((scenario) => scenario.orderFailure?.code).filter((code): code is string => Boolean(code)),
)

describe('契约错误码 ↔ mock 场景覆盖', () => {
  it('claim 契约声明的每个错误码都至少有一个场景产出', () => {
    const declared = declaredCodes(claimResponses, 'POST /campaigns/{campaignId}/claim')
    const missing = declared.filter((code) => !claimScenarioCodes.has(code))
    expect(missing).toEqual([])
  })

  it('POST /orders 契约声明的每个错误码都至少有一个场景产出', () => {
    const declared = declaredCodes(orderResponses, 'POST /orders')
    const missing = declared.filter((code) => !orderScenarioCodes.has(code))
    expect(missing).toEqual([])
  })
})
