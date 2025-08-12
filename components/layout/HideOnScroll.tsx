"use client"

import * as motion from "motion/react-client"
import { useEffect, useRef, useState } from "react"

type HideOnScrollProps = {
  children: React.ReactNode
  className?: string
  /**
   * Minimum scroll delta (in px) before toggling visibility to avoid jitter
   */
  threshold?: number
}

export default function HideOnScroll({
  children,
  className,
  threshold = 8,
}: HideOnScrollProps) {
  const [isHidden, setIsHidden] = useState(false)
  const lastScrollYRef = useRef(0)
  const tickingRef = useRef(false)

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      const delta = currentY - lastScrollYRef.current

      if (!tickingRef.current) {
        window.requestAnimationFrame(() => {
          if (currentY <= 0) {
            setIsHidden(false)
          } else if (delta > threshold) {
            // Scrolling down
            setIsHidden(true)
          } else if (delta < -threshold) {
            // Scrolling up
            setIsHidden(false)
          }

          lastScrollYRef.current = currentY
          tickingRef.current = false
        })
        tickingRef.current = true
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [threshold])

  return (
    <motion.header
      initial={{ opacity: 1, y: 0 }}
      animate={isHidden ? { opacity: 0, y: "-100%" } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.header>
  )
}
