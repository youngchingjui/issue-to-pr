import * as React from "react"

import SafariStreamingPaint from "@/components/system/SafariStreamingPaint"
import { cn } from "@/lib/utils/utils-common"

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <>
      <SafariStreamingPaint />
      <div
        className={cn("animate-pulse rounded-md bg-muted", className)}
        {...props}
      />
    </>
  )
}

export default Skeleton
