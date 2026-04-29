import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'

export class ApiResponseError extends Error {
  status: number
  payload: Record<string, unknown> | undefined

  constructor(message: string, status = 500, payload?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiResponseError'
    this.status = status
    this.payload = payload
  }
}

type RouteHandler<TCtx> = (req: Request, ctx: TCtx) => Promise<Response> | Response

type WithApiHandlerOptions = {
  feature?: string
}

export function withApiHandler<TCtx = Record<string, unknown>>(
  handler: RouteHandler<TCtx>,
  options: WithApiHandlerOptions = {},
): RouteHandler<TCtx> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx)
    } catch (error) {
      const url = req.url
      const method = req.method

      if (error instanceof ApiResponseError) {
        if (error.status >= 500) {
          Sentry.captureException(error, {
            tags: {
              kind: 'api-route',
              status: String(error.status),
              method,
              ...(options.feature && { feature: options.feature }),
            },
            extra: { url, payload: error.payload },
          })
        }
        return NextResponse.json(
          { error: error.message, ...(error.payload ?? {}) },
          { status: error.status },
        )
      }

      Sentry.captureException(error, {
        tags: {
          kind: 'api-route',
          method,
          ...(options.feature && { feature: options.feature }),
        },
        extra: { url },
      })

      const message = error instanceof Error ? error.message : 'Internal server error'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }
}
