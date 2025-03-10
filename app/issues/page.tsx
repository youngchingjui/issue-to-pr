"use client"

import { useSession } from "next-auth/react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface GitHubIssue {
  title: string
  number: number
  html_url: string
  state: string
  created_at: string
  type?: "issue" | "pull"
  user: {
    login: string
  }
}

export default function IssuesPage() {
  const { data: session } = useSession()
  const [url, setUrl] = useState("")
  const [issueData, setIssueData] = useState<GitHubIssue | null>(null)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIssueData(null)
    setIsLoading(true)

    try {
      const response = await fetch("/api/github/fetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch data")
      }

      setIssueData(data)
    } catch (err) {
      console.error("Error fetching data:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">GitHub Issue/PR Viewer</h1>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-4">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter GitHub Issue or PR URL"
            className="flex-1"
            required
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Loading..." : "Fetch Details"}
          </Button>
        </div>
      </form>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {issueData && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  issueData.type === "issue"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {issueData.type === "issue" ? "Issue" : "Pull Request"}
              </span>
              <CardTitle>{issueData.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <strong>Number:</strong> #{issueData.number}
              </p>
              <p>
                <strong>State:</strong> {issueData.state}
              </p>
              <p>
                <strong>Created by:</strong> {issueData.user.login}
              </p>
              <p>
                <strong>Created at:</strong>{" "}
                {new Date(issueData.created_at).toLocaleDateString()}
              </p>
              <p>
                <a
                  href={issueData.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  View on GitHub
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
