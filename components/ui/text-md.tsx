import React from "react"
import { twMerge } from "tailwind-merge"

const TextMd = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  return (
    <p
      className={twMerge(
        "text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold leading-tight",
        className
      )}
    >
      {children}
    </p>
  )
}

export default TextMd
