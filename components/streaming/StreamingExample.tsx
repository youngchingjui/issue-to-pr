"use client"

import GenerateResolutionPlanController from "@/components/issues/controllers/GenerateResolutionPlanController"
import { Button } from "@/components/ui/button"

export function StreamingExample() {
  const { execute, drawer } = GenerateResolutionPlanController({
    issueNumber: 123,
    repoFullName: "example/repo",
    onStart: () => console.log("Started"),
    onComplete: () => console.log("Completed"),
    onError: () => console.log("Error"),
    mockMode: true, // Enable mock mode
  })

  return (
    <div className="p-4">
      <Button onClick={execute}>Test Streaming Drawer</Button>
      {drawer}
    </div>
  )
}
