"use server"
const DEFAULT_TOOLS = [
  "apply_patch",
  "manage_branch",
  "commit_changes",
  "container_exec",
  "create_pull_request",
  "file_check",
  "get_file_content",
  "get_issue",
  "create_issue_comment",
  "ripgrep_search",
  "sync_branch_to_remote",
  "write_file",
]

import Link from "next/link"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import OAuthTokenCard from "@/components/auth/OAuthTokenCard"
import RepoSelector from "@/components/common/RepoSelector"
import AgentWorkflowClient from "@/components/playground/AgentWorkflowClient"
import AnthropicIssueTitleCard from "@/components/playground/AnthropicIssueTitleCard"
import AppInstallationsCard from "@/components/playground/AppInstallationsCard"
import ApplyPatchCard from "@/components/playground/ApplyPatchCard"
import DockerodeExecCard from "@/components/playground/DockerodeExecCard"
import IssueTitleCard from "@/components/playground/IssueTitleCard"
import NewLocalTaskInput from "@/components/playground/NewLocalTaskInput"
import RipgrepSearchCard from "@/components/playground/RipgrepSearchCard"
import SpeechToTextCard from "@/components/playground/SpeechToTextCard"
import TestGithubUserFunctionsCard from "@/components/playground/TestGithubUserFunctionsCard"
import UserRolesCard from "@/components/playground/UserRolesCard"
import WriteFileCard from "@/components/playground/WriteFileCard"
import { Button } from "@/components/ui/button"
import { getGithubUser } from "@/lib/github/users"
import { getUserRoles } from "@/lib/neo4j/services/user"

export default async function PlaygroundToolsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/")
  }

  const githubUser = await getGithubUser()
  const roles = githubUser
    ? await getUserRoles(githubUser.login).catch(() => [])
    : []
  const isAdmin = roles.includes("admin")
  if (!isAdmin) {
    redirect("/")
  }

  const token = session?.token?.access_token as string | undefined

  return (
    <div className="space-y-8 px-4 py-8 md:container md:mx-auto">
      <div>
        <h2 className="text-lg font-semibold mb-2">
          Create Local Task (Neo4j)
        </h2>
        <NewLocalTaskInput
          repoFullName={{
            owner: "issue-to-pr",
            repo: "test-repo",
            fullName: "issue-to-pr/test-repo",
          }}
        />
        <AppInstallationsCard />
        <TestGithubUserFunctionsCard />
      </div>
      <AgentWorkflowClient defaultTools={DEFAULT_TOOLS} />
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Repository & Issue Tools</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="col-span-1">
            <div className="rounded-lg border p-4">
              <h3 className="font-medium mb-2">Test Repo Selector Component</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Use this to test the RepoSelector component. It should show a
                button to install the GitHub App if no repos are available.
                Uninstall the GitHub App to test the installation CTA.
              </p>
              <RepoSelector selectedRepo="issue-to-pr/test-repo" />
            </div>
          </div>
          <IssueTitleCard />
          <AnthropicIssueTitleCard />
          <RipgrepSearchCard />
          <WriteFileCard />
          <ApplyPatchCard />
          <DockerodeExecCard />
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">User & Misc Tools</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <SpeechToTextCard />
          <UserRolesCard />
          {token ? <OAuthTokenCard token={token} /> : null}
        </div>
      </section>
      <div>
        <Link href="/playground/evals">
          <Button variant="outline" size="sm">
            LLM Evaluations
          </Button>
        </Link>
      </div>
    </div>
  )
}
