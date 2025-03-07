import React from "react"
import { twMerge } from "tailwind-merge"

const TextLg = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  return (
    <p
      className={twMerge(
        "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold mb-3 sm:mb-6 md:mb-8 leading-tight",
        className
      )}
    >
      {children}
    </p>
  )
}

export default TextLg
