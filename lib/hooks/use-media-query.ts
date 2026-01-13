import { useEffect, useState } from "react"
import resolveConfig from "tailwindcss/resolveConfig"

import tailwindConfig from "@/tailwind.config"

// Get the full Tailwind config
const fullConfig = resolveConfig(tailwindConfig)

// Extract breakpoints from the config
const breakpoints = fullConfig.theme.screens as Record<string, string>

type BreakpointKey = keyof typeof breakpoints
type BreakpointQuery = BreakpointKey | `max-${BreakpointKey}`

export function useMediaQuery(query: BreakpointQuery): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const isMaxQuery = query.startsWith("max-")
    const breakpoint = isMaxQuery ? query.slice(4) : query

    const mediaQuery = isMaxQuery
      ? `(max-width: ${breakpoints[breakpoint]})`
      : `(min-width: ${breakpoints[breakpoint]})`

    const media = window.matchMedia(mediaQuery)

    // Set initial value
    setMatches(media.matches)

    // Create event listener
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches)

    // Add listener
    media.addEventListener("change", listener)

    // Clean up
    return () => media.removeEventListener("change", listener)
  }, [query])

  return matches
}
