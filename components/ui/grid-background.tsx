import React from "react"

interface GridBackgroundProps {
  children: React.ReactNode
  className?: string
}

const GridBackground = ({ children, className = "" }: GridBackgroundProps) => {
  const gridStyle = {
    backgroundSize: `32px 32px`,
    backgroundImage: `
      linear-gradient(to right, hsl(var(--border) / 0.15) 1px, transparent 1px),
      linear-gradient(to bottom, hsl(var(--border) / 0.15) 1px, transparent 1px)
    `,
    opacity: 0.5,
  }

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0" style={gridStyle} />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

export default GridBackground
