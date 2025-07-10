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

import { auth } from "@/auth"
import OAuthTokenCard from "@/components/auth/OAuthTokenCard"
import AgentWorkflowClient from "@/components/playground/AgentWorkflowClient"
import DockerodeExecCard from "@/components/playground/DockerodeExecCard"
import RipgrepSearchCard from "@/components/playground/RipgrepSearchCard"
import SWRDemoCard from "@/components/playground/SWRDemoCard"
import WriteFileCard from "@/components/playground/WriteFileCard"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function PlaygroundPage() {
  const session = await auth()
  const token = session?.token?.access_token as string | undefined

  return (
    <div className="space-y-8 px-4 py-8 md:container md:mx-auto">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Custom Workflow Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            The playground lets you manually connect tools with an agent and run
            the workflow inside a container environment. Use it to experiment
            with different prompts and tool selections.
          </p>
          <ol className="list-decimal space-y-1 pl-4">
            <li>Select a repository, branch, and issue.</li>
            <li>Edit the system prompt and user messages.</li>
            <li>Choose which tools the agent can access.</li>
            <li>Configure or launch a container environment.</li>
            <li>Start the run to see real-time progress and results.</li>
          </ol>
          <p>
            When the run completes, review the output and decide whether to
            publish the generated content to GitHub.
          </p>
        </CardContent>
      </Card>
      <AgentWorkflowClient defaultTools={DEFAULT_TOOLS} />
      <SWRDemoCard />
      <RipgrepSearchCard />
      <DockerodeExecCard />
      <WriteFileCard />
      {token ? <OAuthTokenCard token={token} /> : null}
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
