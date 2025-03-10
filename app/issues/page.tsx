"use client"

import { useState } from "react"

import CreatePRController from "@/components/issues/controllers/CreatePRController"
import GenerateResolutionPlanController from "@/components/issues/controllers/GenerateResolutionPlanController"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { GitHubRepository } from "@/lib/types"

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
  const [url, setUrl] = useState("")
  const [issueData, setIssueData] = useState<GitHubIssue | null>(null)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null)

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

  // Extract repository information from GitHub URL
  const getRepoFromUrl = (url: string): GitHubRepository | null => {
    try {
      const urlObj = new URL(url)
      const [, username, repo] = urlObj.pathname.split("/")
      // We know the controllers only use these fields, so we can safely cast
      return {
        name: repo,
        full_name: `${username}/${repo}`,
        default_branch: "main", // assuming main as default
        owner: {
          login: username,
        },
      } as GitHubRepository
    } catch (e) {
      return null
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
              {issueData.type === "issue" && (
                <div className="flex gap-4 mt-4">
                  <Button
                    onClick={() => {
                      const repo = getRepoFromUrl(issueData.html_url)
                      if (!repo) return

                      const controller = GenerateResolutionPlanController({
                        issueNumber: issueData.number,
                        repo,
                        onStart: () => {
                          setIsLoading(true)
                          setActiveWorkflow("Generating Plan...")
                        },
                        onComplete: () => {
                          setIsLoading(false)
                          setActiveWorkflow(null)
                        },
                        onError: () => {
                          setIsLoading(false)
                          setActiveWorkflow(null)
                        },
                      })
                      controller.execute()
                    }}
                    disabled={isLoading}
                  >
                    {activeWorkflow === "Generating Plan..."
                      ? "Generating..."
                      : "Generate Resolution Plan"}
                  </Button>
                  <Button
                    onClick={() => {
                      const repo = getRepoFromUrl(issueData.html_url)
                      if (!repo) return

                      const controller = CreatePRController({
                        issueNumber: issueData.number,
                        repo,
                        onStart: () => {
                          setIsLoading(true)
                          setActiveWorkflow("Creating PR...")
                        },
                        onComplete: () => {
                          setIsLoading(false)
                          setActiveWorkflow(null)
                        },
                        onError: () => {
                          setIsLoading(false)
                          setActiveWorkflow(null)
                        },
                      })
                      controller.execute()
                    }}
                    disabled={isLoading}
                  >
                    {activeWorkflow === "Creating PR..."
                      ? "Creating..."
                      : "Fix Issue and Create PR"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
