import React from "react"

const TextLg = ({ children }: { children: React.ReactNode }) => {
  return (
    <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold mb-3 sm:mb-6 md:mb-8 leading-tight">
      {children}
    </p>
  )
}

export default TextLg
