import { reportSupabaseError } from '@/lib/supabaseReport'

type AnyObject = Record<string, unknown>

function isThenable(value: unknown): value is { then: (...args: unknown[]) => unknown } {
  return !!value && (typeof value === 'object' || typeof value === 'function') && typeof (value as AnyObject).then === 'function'
}

function wrapBuilder<T extends object>(builder: T, table: string | undefined): T {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      const orig = Reflect.get(target, prop, receiver)

      if (prop === 'then' && typeof orig === 'function') {
        return (
          onFulfilled?: (value: unknown) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) =>
          (orig as (...args: unknown[]) => unknown).call(
            target,
            (value: unknown) => {
              if (value && typeof value === 'object' && 'error' in value) {
                const err = (value as { error: unknown }).error
                if (err && typeof err === 'object' && 'message' in err) {
                  reportSupabaseError(err as { message: string }, { table })
                }
              }
              return onFulfilled ? onFulfilled(value) : value
            },
            onRejected,
          )
      }

      if (typeof orig === 'function') {
        return (...args: unknown[]) => {
          const result = (orig as (...a: unknown[]) => unknown).apply(target, args)
          if (result && typeof result === 'object' && isThenable(result)) {
            return wrapBuilder(result as object, table)
          }
          return result
        }
      }

      return orig
    },
  })
}

export function withSupabaseReporting<T extends object>(client: T): T {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const orig = Reflect.get(target, prop, receiver)
      if (prop === 'from' && typeof orig === 'function') {
        return (table: string) => {
          const builder = (orig as (t: string) => object).call(target, table)
          return wrapBuilder(builder, table)
        }
      }
      if (prop === 'rpc' && typeof orig === 'function') {
        return (...args: unknown[]) => {
          const builder = (orig as (...a: unknown[]) => object).apply(target, args)
          return wrapBuilder(builder, typeof args[0] === 'string' ? `rpc:${args[0]}` : 'rpc')
        }
      }
      return orig
    },
  })
}
