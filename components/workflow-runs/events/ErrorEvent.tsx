import { XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { CollapsibleContent } from "@/components/ui/collapsible-content"
import { ErrorEvent as ErrorEventType } from "@/lib/types/workflow"
import { formatEventTime } from "@/lib/utils/date-utils"

interface ErrorEventProps {
  event: ErrorEventType
}

function getMainErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  if (typeof error === "object" && error !== null) {
    const errorObj = error as Record<string, unknown>
    return (
      (errorObj.gqlStatusDescription as string) ||
      (errorObj.message as string) ||
      JSON.stringify(error)
    )
  }
  return "Unknown error"
}

export function ErrorEvent({ event }: ErrorEventProps) {
  const { data, timestamp } = event
  const mainErrorMessage = getMainErrorMessage(data.error)

  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <XCircle className="h-4 w-4 text-destructive" />
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-destructive text-sm">Error</span>
          {data.toolName && (
            <>
              <span className="text-xs text-muted-foreground">/</span>
              <span className="text-xs font-medium">{data.toolName}</span>
            </>
          )}
        </div>
        {data.recoverable !== undefined && (
          <Badge
            variant={data.recoverable ? "outline" : "destructive"}
            className="ml-2"
          >
            {data.recoverable ? "Recoverable" : "Non-recoverable"}
          </Badge>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        {formatEventTime(timestamp)}
      </div>
    </div>
  )

  return (
    <CollapsibleContent
      headerContent={headerContent}
      className="border-l-2 border-destructive hover:bg-muted/50"
    >
      <div className="space-y-3">
        {/* Main error message */}
        <div className="text-sm text-destructive">{mainErrorMessage}</div>

        {/* Metadata */}
        {data.retryCount !== undefined && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Retry count:</span> {data.retryCount}
          </div>
        )}

        {/* Detailed error object */}
        {typeof data.error === "object" &&
          data.error !== null &&
          !(data.error instanceof Error) && (
            <div className="font-mono text-xs">
              <pre className="bg-muted/50 rounded-md p-2 border overflow-x-auto">
                <code style={{ display: "inline-block", minWidth: "100%" }}>
                  {JSON.stringify(data.error, null, 2)}
                </code>
              </pre>
            </div>
          )}
      </div>
    </CollapsibleContent>
  )
}
