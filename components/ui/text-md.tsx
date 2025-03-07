import React from "react"

const TextMd = ({ children }: { children: React.ReactNode }) => {
  return (
    <p className="text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold leading-tight">
      {children}
    </p>
  )
}

export default TextMd
