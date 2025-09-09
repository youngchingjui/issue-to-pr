import { useEffect, useState } from "react"

/**
 * Heuristic hook to detect whether showing keyboard shortcut hints makes sense.
 *
 * We consider a device to "have a keyboard" when it's likely a desktop/laptop
 * environment (hover available, fine pointer) and not a primarily touch device.
 * We also flip to true if we ever detect a keydown event, which covers cases
 * like tablets with external keyboards.
 */
export function useHasKeyboard(): boolean {
  const [hasKeyboard, setHasKeyboard] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const mq = (q: string) => window.matchMedia(q)

    const computeHasKeyboard = () => {
      const hasFinePointer =
        mq("(pointer: fine)").matches || mq("(any-pointer: fine)").matches
      const hasHover =
        mq("(hover: hover)").matches || mq("(any-hover: hover)").matches

      const ua = window.navigator.userAgent || ""
      const platform = window.navigator.platform || ""
      const isMobileUA = /Mobi|Android|iPhone|iPad|iPod|Phone/i.test(ua)
      const maxTouchPoints = window.navigator.maxTouchPoints ?? 0
      const looksDesktopPlatform =
        /(Mac|Win|Linux)/i.test(platform) && maxTouchPoints < 2
      return (hasFinePointer && hasHover && !isMobileUA) || looksDesktopPlatform
    }

    setHasKeyboard(computeHasKeyboard())

    // Upgrade to true only on signals typical of physical keyboards
    const onKeyDown = (e: KeyboardEvent) => {
      const isHardwareLike =
        e.metaKey ||
        e.ctrlKey ||
        e.key === "Escape" ||
        e.key === "Tab" ||
        e.key.startsWith("Arrow") ||
        /^F\d{1,2}$/.test(e.key)
      if (isHardwareLike) setHasKeyboard(true)
    }
    window.addEventListener("keydown", onKeyDown)

    // Listen for media changes to update heuristic
    const listeners: Array<{
      mql: MediaQueryList
      handler: (e: MediaQueryListEvent) => void
    }> = []
    const makeListener = (query: string) => {
      const mql = mq(query)
      const handler = () => {
        setHasKeyboard(computeHasKeyboard())
      }
      mql.addEventListener("change", handler)
      listeners.push({ mql, handler })
    }

    makeListener("(pointer: fine)")
    makeListener("(any-pointer: fine)")
    makeListener("(hover: hover)")
    makeListener("(any-hover: hover)")

    return () => {
      window.removeEventListener("keydown", onKeyDown)
      listeners.forEach(({ mql, handler }) =>
        mql.removeEventListener("change", handler)
      )
    }
  }, [])

  return hasKeyboard
}
