import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { scenarios, type MockFailure, type MockScenario } from './scenarios'

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

type OperationNode = { responses: OpenApiResponses }

interface OpenApiDoc {
  paths: Record<string, Partial<Record<'post' | 'put' | 'delete', OperationNode>>>
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

function declaredCodes(node: OperationNode, operation: string): string[] {
  const codes = new Set<string>()
  for (const response of Object.values(node.responses)) {
    for (const code of extractCodes(resolveResponse(response).description)) {
      codes.add(code)
    }
  }
  expect(
    codes.size,
    `契约 operation「${operation}」未解析出任何错误码，请核对 description 里的 code 声明格式`,
  ).toBeGreaterThan(0)
  return [...codes]
}

function collectScenarioCodes(selectFailure: (scenario: MockScenario) => MockFailure | undefined): Set<string> {
  return new Set(
    scenarios
      .map((scenario) => selectFailure(scenario)?.code)
      .filter((code): code is string => Boolean(code)),
  )
}

interface CoverageTarget {
  readonly label: string
  readonly operation: OperationNode
  readonly selectFailure: (scenario: MockScenario) => MockFailure | undefined
}

const COVERAGE_TARGETS: readonly CoverageTarget[] = [
  {
    label: 'POST /campaigns/{campaignId}/claim',
    operation: openapi.paths['/campaigns/{campaignId}/claim'].post!,
    selectFailure: (scenario) => scenario.claimFailure,
  },
  {
    label: 'POST /orders',
    operation: openapi.paths['/orders'].post!,
    selectFailure: (scenario) => scenario.orderFailure,
  },
  {
    label: 'POST /addresses',
    operation: openapi.paths['/addresses'].post!,
    selectFailure: (scenario) => scenario.addressCreateFailure,
  },
  {
    label: 'PUT /addresses/{addressId}',
    operation: openapi.paths['/addresses/{addressId}'].put!,
    selectFailure: (scenario) => scenario.addressUpdateFailure,
  },
  {
    label: 'DELETE /addresses/{addressId}',
    operation: openapi.paths['/addresses/{addressId}'].delete!,
    selectFailure: (scenario) => scenario.addressDeleteFailure,
  },
  {
    label: 'PUT /addresses/{addressId}/default',
    operation: openapi.paths['/addresses/{addressId}/default'].put!,
    selectFailure: (scenario) => scenario.addressDefaultFailure,
  },
  {
    label: 'POST /fulfillments/{fulfillmentId}/sign',
    operation: openapi.paths['/fulfillments/{fulfillmentId}/sign'].post!,
    selectFailure: (scenario) => scenario.signFailure,
  },
  {
    label: 'POST /admin/categories',
    operation: openapi.paths['/admin/categories'].post!,
    selectFailure: (scenario) => scenario.categoryFailure,
  },
  {
    label: 'PUT /admin/categories/{categoryId}',
    operation: openapi.paths['/admin/categories/{categoryId}'].put!,
    selectFailure: (scenario) => scenario.categoryFailure,
  },
  {
    label: 'DELETE /admin/categories/{categoryId}',
    operation: openapi.paths['/admin/categories/{categoryId}'].delete!,
    selectFailure: (scenario) => scenario.categoryFailure,
  },
  {
    label: 'POST /auth/register',
    operation: openapi.paths['/auth/register'].post!,
    selectFailure: (scenario) => scenario.registerFailure,
  },
  {
    label: 'POST /auth/login',
    operation: openapi.paths['/auth/login'].post!,
    selectFailure: (scenario) => scenario.loginFailure,
  },
  {
    label: 'POST /auth/logout',
    operation: openapi.paths['/auth/logout'].post!,
    selectFailure: (scenario) => scenario.logoutFailure,
  },
  {
    label: 'PUT /me/password',
    operation: openapi.paths['/me/password'].put!,
    selectFailure: (scenario) => scenario.passwordFailure,
  },
]

describe('契约错误码 ↔ mock 场景覆盖', () => {
  it.each(COVERAGE_TARGETS)(
    '$label 契约声明的每个错误码都至少有一个场景产出',
    ({ label, operation, selectFailure }) => {
      const declared = declaredCodes(operation, label)
      const covered = collectScenarioCodes(selectFailure)
      expect(declared.filter((code) => !covered.has(code))).toEqual([])
    },
  )
})
