import { useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/utils-common"

interface CollapsibleContentProps {
  children: React.ReactNode
  className?: string
  headerContent: React.ReactNode
  defaultExpanded?: boolean
  maxCollapsedHeight?: string
}

export function CollapsibleContent({
  children,
  className,
  headerContent,
  defaultExpanded = false,
  maxCollapsedHeight = "max-h-32",
}: CollapsibleContentProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors w-full overflow-hidden",
        className
      )}
    >
      <div className="px-3 py-1.5 sm:px-4 sm:py-2 border-b flex items-center justify-between">
        {headerContent}
      </div>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          !isExpanded && maxCollapsedHeight
        )}
      >
        <div className="p-3 sm:p-4 overflow-x-auto">{children}</div>
      </div>
      <div className="px-3 py-2 sm:px-4 border-t text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleExpand}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          {isExpanded ? "Show Less" : "Show More"}
        </Button>
      </div>
    </div>
  )
}
