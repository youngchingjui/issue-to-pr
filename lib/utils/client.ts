// Client-side utilities - frontend/browser-specific helpers
export { cn } from "./utils-common"

export const maskApiKey = (key: string) => {
  if (key.length <= 10) return key
  return `${key.slice(0, 5)}**********${key.slice(-4)}`
}
