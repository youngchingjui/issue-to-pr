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

    const hasFinePointer = mq("(pointer: fine)").matches || mq("(any-pointer: fine)").matches
    const hasHover = mq("(hover: hover)").matches || mq("(any-hover: hover)").matches

    const ua = window.navigator.userAgent || ""
    const platform = window.navigator.platform || ""

    // Heuristic mobile/tablet detection
    const isMobileUA = /Mobi|Android|iPhone|iPad|iPod|Phone/i.test(ua)
    const maxTouchPoints = window.navigator.maxTouchPoints ?? 0

    // Consider as desktop if platform looks like a desktop and touch points are few
    const looksDesktopPlatform = /(Mac|Win|Linux)/i.test(platform) && maxTouchPoints < 2

    const initialHasKeyboard = (hasFinePointer && hasHover && !isMobileUA) || looksDesktopPlatform

    setHasKeyboard(initialHasKeyboard)

    // Upgrade to true if any key is pressed (covers tablets w/ external keyboards)
    const onKeyDown = () => setHasKeyboard(true)
    window.addEventListener("keydown", onKeyDown)

    // Listen for media changes to update heuristic
    const listeners: Array<{ mql: MediaQueryList; handler: (e: MediaQueryListEvent) => void }> = []
    const makeListener = (query: string) => {
      const mql = mq(query)
      const handler = () => {
        const nextFinePointer = mq("(pointer: fine)").matches || mq("(any-pointer: fine)").matches
        const nextHasHover = mq("(hover: hover)").matches || mq("(any-hover: hover)").matches
        const nextIsMobileUA = /Mobi|Android|iPhone|iPad|iPod|Phone/i.test(window.navigator.userAgent || "")
        const nextLooksDesktopPlatform = /(Mac|Win|Linux)/i.test(window.navigator.platform || "") && (window.navigator.maxTouchPoints ?? 0) < 2
        setHasKeyboard((nextFinePointer && nextHasHover && !nextIsMobileUA) || nextLooksDesktopPlatform)
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
      listeners.forEach(({ mql, handler }) => mql.removeEventListener("change", handler))
    }
  }, [])

  return hasKeyboard
}

