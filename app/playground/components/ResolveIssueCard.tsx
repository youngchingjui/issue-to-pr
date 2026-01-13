"use client"

import { CheckCircle, Loader2, XCircle } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { resolveIssueAction } from "@/lib/actions/resolveIssue"
import type { ResolveIssueResult } from "@/lib/actions/schemas"
import { Alert, AlertDescription } from "@/shared/ui/alert"

export function ResolveIssueCard() {
  const [repoFullName, setRepoFullName] = useState("")
  const [issueNumber, setIssueNumber] = useState("")
  const [model, setModel] = useState("gpt-4o-mini")
  const [maxTokens, setMaxTokens] = useState("2000")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ResolveIssueResult | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setResult(null)

    try {
      const data = await resolveIssueAction({
        repoFullName,
        issueNumber: parseInt(issueNumber),
        model,
        maxTokens: parseInt(maxTokens),
      })
      setResult(data)
    } catch (error) {
      setResult({
        status: "error",
        code: "UNKNOWN",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Resolve Issue Use Case</span>
          {result &&
            (result.status === "success" ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            ))}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="repoFullName">Repository Full Name</Label>
              <Input
                id="repoFullName"
                placeholder="owner/repo"
                value={repoFullName}
                onChange={(e) => setRepoFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issueNumber">Issue Number</Label>
              <Input
                id="issueNumber"
                type="number"
                placeholder="123"
                value={issueNumber}
                onChange={(e) => setIssueNumber(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                placeholder="gpt-4o-mini"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                placeholder="2000"
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resolving Issue...
              </>
            ) : (
              "Resolve Issue"
            )}
          </Button>
        </form>

        {result && (
          <div className="space-y-4">
            {result.status === "success" ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Issue resolved successfully!
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to resolve issue: {result.message}
                </AlertDescription>
              </Alert>
            )}

            {result.status === "success" && result.issue && (
              <div className="space-y-2">
                <h4 className="font-semibold">Issue Details</h4>
                <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                  <div>
                    <strong>Repository:</strong> {result.issue.repoFullName}
                  </div>
                  <div>
                    <strong>Issue #:</strong> {result.issue.number}
                  </div>
                  <div>
                    <strong>Title:</strong> {result.issue.title || "No title"}
                  </div>
                  <div>
                    <strong>State:</strong> {result.issue.state}
                  </div>
                  <div>
                    <strong>Author:</strong>{" "}
                    {result.issue.authorLogin || "Unknown"}
                  </div>
                  <div>
                    <strong>URL:</strong>{" "}
                    <a
                      href={result.issue.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {result.issue.url}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {result.status === "success" && result.response && (
              <div className="space-y-2">
                <h4 className="font-semibold">LLM Response</h4>
                <Textarea
                  value={result.response}
                  readOnly
                  className="min-h-32"
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
