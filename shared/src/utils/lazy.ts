export const lazy = <T>(fn: () => Promise<T>) => {
  let promise: Promise<T> | undefined
  return () => (promise ??= fn())
}
