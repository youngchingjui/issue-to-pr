"use client"

import { useState } from "react"

import WorkflowStream from "@/components/workflow-runs/WorkflowStream"

export default function WorkflowTest() {
  const [workflowId, setWorkflowId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  const handleStartWorkflow = async () => {
    try {
      setError(null)
      console.log("Starting workflow...")
      const response = await fetch("/api/workflow-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issueNumber: 304,
          repoFullName: "youngchingjui/issue-to-pr",
        }),
      })
      const data = await response.json()
      console.log("Workflow created:", data)
      setWorkflowId(data.workflowId)
    } catch (error) {
      console.error("Error starting workflow:", error)
      setError("Failed to start workflow")
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Workflow Test</h1>
      <div className="flex items-center gap-4 mb-4">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleStartWorkflow}
        >
          Start Workflow
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {workflowId && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">
            Workflow Stream{" "}
            <span className="text-sm font-normal text-gray-600">
              ({workflowId})
            </span>
          </h2>
          <WorkflowStream workflowId={workflowId} />
        </div>
      )}
    </div>
  )
}
