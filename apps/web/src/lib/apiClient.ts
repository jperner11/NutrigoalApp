import * as Sentry from '@sentry/nextjs'

export class ApiError extends Error {
  status: number
  payload: unknown
  url: string

  constructor(message: string, status: number, payload: unknown, url: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
    this.url = url
  }
}

export type ApiContext = {
  feature?: string
  action?: string
  extra?: Record<string, unknown>
}

type ApiInit = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown> | unknown[] | null
  context?: ApiContext
}

function buildScope(url: string, context: ApiContext | undefined, extra: Record<string, unknown>) {
  const tags: Record<string, string> = {}
  if (context?.feature) tags.feature = context.feature
  if (context?.action) tags.action = context.action
  return {
    tags,
    extra: { url, ...context?.extra, ...extra },
  }
}

export async function apiFetch<T = unknown>(url: string, init: ApiInit = {}): Promise<T> {
  const { context, body, headers: rawHeaders, ...rest } = init
  const headers = new Headers(rawHeaders)

  let finalBody: BodyInit | null | undefined
  if (body == null || typeof body === 'string' || body instanceof FormData || body instanceof Blob || body instanceof URLSearchParams || body instanceof ArrayBuffer) {
    finalBody = body as BodyInit | null | undefined
  } else {
    finalBody = JSON.stringify(body)
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(url, { ...rest, headers, body: finalBody })
  } catch (err) {
    const scope = buildScope(url, context, { kind: 'network' })
    Sentry.captureException(err, { tags: { kind: 'network', ...scope.tags }, extra: scope.extra })
    throw err
  }

  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && payload !== null && 'error' in payload && typeof (payload as { error: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : null) ?? `Request failed (${response.status})`
    const err = new ApiError(message, response.status, payload, url)
    const scope = buildScope(url, context, { kind: 'api', status: response.status, payload })
    Sentry.captureException(err, {
      tags: { kind: 'api', status: String(response.status), ...scope.tags },
      extra: scope.extra,
    })
    throw err
  }

  return payload as T
}

export function reportClientError(err: unknown, context: ApiContext = {}) {
  Sentry.captureException(err, {
    tags: {
      kind: 'client',
      ...(context.feature && { feature: context.feature }),
      ...(context.action && { action: context.action }),
    },
    extra: context.extra,
  })
}
