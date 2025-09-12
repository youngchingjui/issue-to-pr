export const lazy = <T>(fn: () => Promise<T>) => {
  console.log("start of lazy")
  let done = false,
    value: Promise<T>
  return () => {
    console.log("inside lazy", "done", done, "value", value)
    if (!done) {
      console.log("not done")
      value = fn()
      done = true
    }
    console.log("done", "value: ", value)
    return value
  }
}
