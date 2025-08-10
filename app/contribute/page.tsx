"use client"

import { useState } from "react"
import { z } from "zod"

import { FetchGitHubItemRequestSchema } from "@/app/api/github/fetch/schemas"
import GitHubItemDetails from "@/components/contribute/GitHubItemDetails"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GitHubURLSchema } from "@/lib/schemas/api"
import { GitHubItem, WorkflowType } from "@/lib/types/github"

interface ErrorResponse {
  error: string
  details?: z.ZodError["errors"] | string
}

export default function ContributePage() {
  const [url, setUrl] = useState("")
  const [issueData, setIssueData] = useState<GitHubItem | null>(null)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowType | null>(
    null
  )

  // Validate URL as user types
  const validateUrl = (value: string) => {
    setUrl(value)
    if (!value) {
      setError("")
      return
    }

    try {
      GitHubURLSchema.parse(value)
      setError("")
    } catch (err) {
      if (err instanceof z.ZodError) {
        // Only show validation error if user has stopped typing for a moment
        const debounceValidation = setTimeout(() => {
          setError(err.errors[0].message)
        }, 500)
        return () => clearTimeout(debounceValidation)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIssueData(null)
    setIsLoading(true)

    try {
      // Parse the URL on the client side
      const { type, number, fullName } = GitHubURLSchema.parse(url)
      const requestBody = FetchGitHubItemRequestSchema.parse({
        type,
        number,
        fullName,
      })

      const response = await fetch("/api/github/fetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorData = data as ErrorResponse
        if (response.status === 400 && errorData.details) {
          // Handle validation errors from the server
          const details = Array.isArray(errorData.details)
            ? errorData.details[0].message // Zod error
            : errorData.details // JSON parse error
          throw new Error(`${errorData.error}: ${details}`)
        }
        throw new Error(errorData.error || "Failed to fetch data")
      }

      setIssueData(data)
    } catch (err) {
      console.error("Error fetching data:", err)
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message)
      } else {
        setError(err instanceof Error ? err.message : "An error occurred")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">
        Contribute to Public Repositories
      </h1>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              type="url"
              value={url}
              onChange={(e) => validateUrl(e.target.value)}
              placeholder="Enter GitHub Issue or PR URL (e.g., https://github.com/owner/repo/issues/123)"
              className={error ? "border-red-500" : ""}
              required
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
          <Button type="submit" disabled={isLoading || !!error}>
            {isLoading ? "Loading..." : "Fetch Details"}
          </Button>
        </div>
      </form>

      {issueData && (
        <GitHubItemDetails
          item={issueData}
          isLoading={isLoading}
          activeWorkflow={activeWorkflow}
          onWorkflowStart={(workflow) => {
            setIsLoading(true)
            setActiveWorkflow(workflow)
          }}
          onWorkflowComplete={() => {
            setIsLoading(false)
            setActiveWorkflow(null)
          }}
          onWorkflowError={() => {
            setIsLoading(false)
            setActiveWorkflow(null)
          }}
        />
      )}
    </div>
  )
}
