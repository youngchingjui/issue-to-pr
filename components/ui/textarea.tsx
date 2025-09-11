import * as React from "react"

import { cn } from "@/lib/utils/utils-common"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        // Increase height on mobile for better typing experience.
        // Default (mobile-first) min-height is now 120px (~double the old 60px).
        // Revert back to the previous 60px on medium screens and above so the
        // textarea doesn’t feel oversized on desktop.
        "flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:min-h-[60px] md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }

