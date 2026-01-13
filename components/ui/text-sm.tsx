import React from "react"
import { twMerge } from "tailwind-merge"

const TextSm = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  return (
    <p className={twMerge(`text-sm sm:text-base leading-tight`, className)}>
      {children}
    </p>
  )
}

export default TextSm
