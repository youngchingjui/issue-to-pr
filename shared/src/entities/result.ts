export type Ok<T> = { ok: true; value: T }
export type Err<E extends string, D = unknown> = {
  ok: false
  error: E
  details?: D
}
export type Result<T, E extends string = string, D = unknown> =
  | Ok<T>
  | Err<E, D>

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value })
export const err = <E extends string, D = unknown>(
  error: E,
  details?: D
): Err<E, D> => ({ ok: false, error, details })

