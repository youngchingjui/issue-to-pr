import { Suspense } from "react"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import NewTaskInput from "@/components/issues/NewTaskInput"
import RepoWorkflowRuns from "@/components/issues/RepoWorkflowRuns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { listUserRepositories } from "@/lib/github/users"

function getSearchParams() {
  if (typeof window === "undefined") return {}
  const params = new URLSearchParams(window.location.search)
  return Object.fromEntries(params)
}

async function getPreferredRepo() {
  const repos = await listUserRepositories()
  // Prefer first, or throw
  if (repos.length === 0) return null
  return repos[0].full_name || null
}

export default async function IssuesPage({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
  // SSR: searchParams injected by Next.js
  // Fallback if user navigates directly to /issues (no repo)
  const repos = await listUserRepositories()

  if (repos.length === 0) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">Your Issues</h1>
        <div className="text-destructive">You have no accessible repositories. Please add or connect a GitHub account with repositories.</div>
      </div>
    )
  }

  let repoFullName = searchParams?.repo || repos[0]?.full_name
  if (!repoFullName) {
    // SSR redirect to best guess
    redirect(`/issues?repo=${encodeURIComponent(repos[0].full_name)}`)
    return null
  }

  return (
    <main className="container mx-auto py-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold">Your Issues & Workflows</h1>
        <div className="flex items-center gap-3">
          {/* Repo selector */}
          <form
            action={(formData) => {
              // Client-only navigation
              'use client'
              const repo = formData.get('repo') as string
              if (repo) {
                window.location.href = `/issues?repo=${encodeURIComponent(repo)}`
              }
            }}
          >
            <Select defaultValue={repoFullName} name="repo" onValueChange={(val) => {
              window.location.href = `/issues?repo=${encodeURIComponent(val)}`
            }}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select repository" />
              </SelectTrigger>
              <SelectContent>
                {repos.map((repo) => (
                  <SelectItem key={repo.full_name} value={repo.full_name}>
                    {repo.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </form>
        </div>
      </div>
      {/* New issue input */}
      <div className="mb-6">
        <NewTaskInput repoFullName={repoFullName} />
      </div>
      <Suspense fallback={<div>Loading workflow runs...</div>}>
        <RepoWorkflowRuns repoFullName={repoFullName} />
      </Suspense>
    </main>
  )
}
