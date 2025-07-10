"use server"

import IssueWorkflowRunsClient from "@/components/issues/IssueWorkflowRunsClient"
import { listWorkflowRuns } from "@/lib/neo4j/services/workflow"

interface Props {
  repoFullName: string
  issueNumber: number
}

export default async function IssueWorkflowRuns({
  repoFullName,
  issueNumber,
}: Props) {
  const runs = await listWorkflowRuns({ repoFullName, issueNumber })
  const poll = runs.some((r) => r.state !== "completed" && r.state !== "error")
  return (
    <IssueWorkflowRunsClient
      repoFullName={repoFullName}
      issueNumber={issueNumber}
      initialRuns={runs}
      poll={poll}
    />
  )
}
