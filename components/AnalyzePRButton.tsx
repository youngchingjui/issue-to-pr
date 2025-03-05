"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { SSEUtils } from "@/lib/utils"

interface Props {
  repoFullName: string
  pullNumber: number
}

export default function AnalyzePRButton({ repoFullName, pullNumber }: Props) {
  const [status, setStatus] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string>("")

  const handleAnalyze = async () => {
    try {
      setIsLoading(true)
      setStatus("Starting analysis...")

      // Start the workflow and get job ID
      const response = await fetch("/api/analyze-pr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repoFullName,
          pullNumber,
        }),
      })

      const { jobId } = await response.json()

      // Subscribe to SSE updates
      const eventSource = new EventSource(`/api/sse?jobId=${jobId}`)

      eventSource.onmessage = (event) => {
        const decodedStatus = SSEUtils.decodeStatus(event.data)

        if (decodedStatus === "Stream finished") {
          eventSource.close()
          setIsLoading(false)
        } else {
          setStatus(decodedStatus)
        }
      }

      eventSource.onerror = () => {
        eventSource.close()
        setIsLoading(false)
        setStatus("Error: Connection lost")
      }
    } catch (error) {
      setIsLoading(false)
      setStatus(`Error: ${error.message}`)
      console.error("Analysis failed: ", error)
    }
  }

  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        onClick={handleAnalyze}
        disabled={isLoading}
        className="px-4 py-2"
      >
        {isLoading ? "Analyzing..." : "Analyze PR Goals"}
      </Button>

      {status && <div className="text-sm text-gray-600">Status: {status}</div>}

      {result && (
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <h3 className="font-bold mb-2">Analysis Result:</h3>
          <pre className="whitespace-pre-wrap">{result}</pre>
        </div>
      )}
    </div>
  )
}
