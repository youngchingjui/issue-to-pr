'use client'

import IssueTableClient from "./IssueTableClient"
import { RepoFullName } from "@/lib/types/github"

interface Props {
  repoFullName: RepoFullName
  refreshSignal?: unknown
  perPage?: number
}

export default function IssueTable(props: Props) {
  // Simply forward props to the client implementation so existing imports do
  // not need to change.
  return <IssueTableClient {...props} />
}

