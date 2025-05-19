"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"

export function TestButton() {
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [error, setError] = useState<string | null>(null)

  // Don't render anything in production
  if (process.env.NODE_ENV !== "development") {
    return null
  }

  const handleTestClick = async () => {
    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      const res = await fetch("/api/test", {
        method: "POST",
      })
      const data = await res.json()
      setResponse(data)
    } catch (err) {
      setError("Failed to call test API")
      console.error("Test button error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 bg-white shadow-xl rounded-lg p-4">
      <Button onClick={handleTestClick} disabled={loading}>
        {loading ? "Running..." : "Run Test"}
      </Button>

      {error && <div className="text-red-500">{error}</div>}

      {response && (
        <div className="space-y-2">
          <div className="font-medium">Results:</div>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto whitespace-pre-wrap text-sm">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
