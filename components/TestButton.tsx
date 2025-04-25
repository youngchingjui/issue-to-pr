"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"

type TestResponse = {
  message: string
  timestamp: string
  searchQuery: string
  searchResults: string
}

export function TestButton() {
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<TestResponse | null>(null)
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
    <div className="space-y-4">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Test API - Ripgrep Search</h1>
        <p className="text-gray-600">
          This test performs a ripgrep search for &quot;TestButton&quot; across
          the codebase. Edit the API route at <code>app/api/test/route.ts</code>{" "}
          to modify the search parameters.
        </p>
      </div>

      <Button onClick={handleTestClick} disabled={loading}>
        {loading ? "Searching..." : "Run Search"}
      </Button>

      {error && <div className="text-red-500">{error}</div>}

      {response && (
        <div className="space-y-2">
          <div className="font-medium">
            Search Query: <code>{response.searchQuery}</code>
          </div>
          <div className="font-medium">
            Timestamp: {new Date(response.timestamp).toLocaleString()}
          </div>
          <div className="font-medium">Results:</div>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto whitespace-pre-wrap text-sm">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
