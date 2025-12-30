"use client"

import { useEffect, useRef, useState } from "react"

interface StatusTickerProps {
  message: string
  // Duration of the slide animation in ms
  duration?: number
}

export function StatusTicker({ message, duration = 250 }: StatusTickerProps) {
  const [current, setCurrent] = useState(message)
  const [incoming, setIncoming] = useState<string | null>(null)
  const [animating, setAnimating] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  // When message prop changes, trigger a slide-up animation
  useEffect(() => {
    if (message === current) return

    let raf: number | null = null
    // Schedule asynchronously to avoid synchronous setState in the effect body
    const pre = window.setTimeout(() => {
      // Prepare incoming message and start animation on next frame
      setIncoming(message)
      setAnimating(false)

      raf = requestAnimationFrame(() => {
        setAnimating(true)
      })

      // After the animation completes, commit the new current message
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => {
        setCurrent(message)
        setIncoming(null)
        setAnimating(false)
      }, duration)
    }, 0)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.clearTimeout(pre)
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [message, current, duration])

  // Choose the widest content to ensure the container reserves width
  const measureText =
    incoming && incoming.length > current.length ? incoming : current

  // Fix the line height to ensure consistent height; tailwind text-sm => 1.25rem
  // We keep width based on content by using an invisible measuring span in flow.
  return (
    <span className="relative inline-block h-5 overflow-hidden align-middle">
      {/* Measuring span to reserve width (not visually shown) */}
      <span className="invisible block">{measureText}</span>

      {/* Previous/current visible message */}
      <span
        className="absolute inset-0 flex items-center will-change-transform"
        style={{
          transform: animating ? "translateY(-100%)" : "translateY(0%)",
          transition: `transform ${duration}ms ease`,
        }}
        aria-hidden={incoming !== null}
      >
        {current}
      </span>

      {/* Incoming message slides up from below */}
      {incoming !== null && (
        <span
          className="absolute inset-0 flex items-center will-change-transform"
          style={{
            transform: animating ? "translateY(0%)" : "translateY(100%)",
            transition: `transform ${duration}ms ease`,
          }}
        >
          {incoming}
        </span>
      )}

      {/* Visually hidden live region to announce updates for a11y */}
      <span className="sr-only" aria-live="polite" aria-atomic>
        {message}
      </span>
    </span>
  )
}
