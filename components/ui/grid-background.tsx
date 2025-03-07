import React from "react"

interface GridBackgroundProps {
  children: React.ReactNode
  className?: string
  bgColor?: string
  gridColor?: string
  gridSize?: number
  animate?: boolean
  maskDirection?: "top" | "bottom" | "left" | "right" | "none"
}

const GridBackground = ({ children, className = "" }: GridBackgroundProps) => {
  // Create grid background style
  const gridStyle = {
    backgroundSize: `32px 32px`,
    backgroundImage: `
      linear-gradient(to right, rgba(0,0,0,0.15) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(0,0,0,0.15) 1px, transparent 1px)
    `,
    opacity: 0.5,
  }

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      <div className={`absolute inset-0 bg-neutral-100`} />
      <div
        className="absolute inset-0"
        style={{
          ...gridStyle,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

export default GridBackground
