"use client"

import { MoreHorizontalIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { CreatePullRequestButton } from "./CreatePullRequestButton"

export function IssueActionsDropdown({ issueId }: { issueId: number }) {
  const handleCommitCode = async (issueId: number) => {
    // Implement commit code logic, likely calling an API route
    console.log(`Committing code for issue ${issueId}`)
    // Similar API call as above
  }

  const handleGitPush = async (issueId: number) => {
    // Implement git push logic, likely calling an API route
    console.log(`Pushing code for issue ${issueId}`)
    // Similar API call as above
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center justify-center w-8 h-8">
        <MoreHorizontalIcon className="w-4 h-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleCommitCode(issueId)}>
          Commit Code
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleGitPush(issueId)}>
          Git Push
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CreatePullRequestButton issueNumber={issueId} repo={repo} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
