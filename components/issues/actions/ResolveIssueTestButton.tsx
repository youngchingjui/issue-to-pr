"use client"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "@/lib/hooks/use-toast"

export function ResolveIssueTestButton() {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (Math.random() < 0.5) {
                toast({
                  title: "Resolution Launch Succeeded (Test)",
                  description:
                    "UI test: ResolveIssue button fired. No backend action was called.",
                })
              } else {
                toast({
                  title: "Failed to Launch Resolution (Test)",
                  description:
                    "UI test: No backend action. This is an error toast for demonstration only.",
                  variant: "destructive",
                })
              }
            }}
            className="ml-2"
            aria-label="Launch resolveIssue (UI Test)"
          >
            Create PR (UI Test)
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <span>
            This button is for UI testing only; it does not launch any backend.
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
