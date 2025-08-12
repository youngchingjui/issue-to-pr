/* Simple timestamped logging utilities for measuring durations around external calls (DB, APIs). */

export type LogMeta = Record<string, unknown> | undefined

function nowIso() {
  return new Date().toISOString()
}

export function logStart(label: string, meta?: LogMeta) {
  const start = Date.now()
  // eslint-disable-next-line no-console
  console.log(`[${nowIso()}][START] ${label}${meta ? " " + JSON.stringify(meta) : ""}`)
  return start
}

export function logEnd(label: string, start: number, meta?: LogMeta) {
  const durationMs = Date.now() - start
  // eslint-disable-next-line no-console
  console.log(
    `[${nowIso()}][END]   ${label} (${durationMs}ms)` +
      (meta ? ` ${JSON.stringify(meta)}` : "")
  )
}

export function logError(label: string, start: number | null, error: unknown, meta?: LogMeta) {
  const durationMs = start ? Date.now() - start : undefined
  // eslint-disable-next-line no-console
  console.error(
    `[${nowIso()}][ERROR] ${label}` +
      (typeof durationMs === "number" ? ` (${durationMs}ms)` : "") +
      (meta ? ` ${JSON.stringify(meta)}` : ""),
    error
  )
}

export async function withTiming<T>(
  label: string,
  fn: () => Promise<T>,
  meta?: LogMeta
): Promise<T> {
  const start = logStart(label, meta)
  try {
    const result = await fn()
    logEnd(label, start)
    return result
  } catch (err) {
    logError(label, start, err, meta)
    throw err
  }
}

