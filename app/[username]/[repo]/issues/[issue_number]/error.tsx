"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function IssueError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="container mx-auto p-4">
      <div className="rounded-lg bg-destructive/10 p-8 text-center">
        <h2 className="text-2xl font-bold text-destructive mb-4">
          Something went wrong!
        </h2>
        <p className="text-muted-foreground mb-4">
          {error.message || "Failed to load issue details"}
        </p>
        <div className="flex gap-4 justify-center">
          <Button
            onClick={() =>
              (window.location.href =
                window.location.href.split("/issues/")[0] + "/issues")
            }
            variant="outline"
          >
            Back to Issues
          </Button>
          <Button onClick={reset} variant="default">
            Try Again
          </Button>
        </div>
      </div>
    </div>
  )
}
