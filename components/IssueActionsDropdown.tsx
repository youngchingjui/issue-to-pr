"use client"

import { MoreHorizontalIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { GitHubRepository } from "@/lib/types"

import { CreatePullRequestButton } from "./CreatePullRequestButton"

export function IssueActionsDropdown({
  issueNumber,
  repo,
}: {
  issueNumber: number
  repo: GitHubRepository
}) {
  const handleCommitCode = async (issueNumber: number) => {
    // Implement commit code logic, likely calling an API route
    console.log(`Committing code for issue ${issueNumber}`)
    // Similar API call as above
  }

  const handleGitPush = async (issueNumber: number) => {
    // Implement git push logic, likely calling an API route
    console.log(`Pushing code for issue ${issueNumber}`)
    // Similar API call as above
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center justify-center w-8 h-8">
        <MoreHorizontalIcon className="w-4 h-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleCommitCode(issueNumber)}>
          Commit Code
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleGitPush(issueNumber)}>
          Git Push
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CreatePullRequestButton issueNumber={issueNumber} repo={repo} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
