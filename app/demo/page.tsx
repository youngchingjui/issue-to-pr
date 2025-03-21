"use client"

import { StreamHandler } from "@/components/StreamHandler"

export default function DemoPage() {
  const handleComplete = (content: string) => {
    console.log("Streaming completed with content:", content)
  }

  const handleError = (error: Error) => {
    console.error("Streaming error:", error)
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-8 text-3xl font-bold">Stream Handler Demo</h1>
      <div className="rounded-lg border bg-card p-6">
        <StreamHandler
          workflowId="demo-workflow-123"
          onComplete={handleComplete}
          onError={handleError}
          className="w-full"
        />
      </div>
    </div>
  )
}
