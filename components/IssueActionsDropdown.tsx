"use client"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontalIcon } from "lucide-react"
import { CreatePullRequestButton } from "./CreatePullRequestButton"

export function IssueActionsDropdown({ issueId }: { issueId: number }) {
  const handleGenerateCode = async (issueId: number) => {
    // Implement generate code logic, likely calling an API route
    console.log(`Generating code for issue ${issueId}`)
    // Example API call:
    /*
    try {
      const response = await fetch('/api/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to generate code')
      alert('Code generated successfully')
    } catch (error) {
      console.error(error)
      alert('Failed to generate code. Please try again.')
    }
    */
  }

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
        <DropdownMenuItem onClick={() => handleGenerateCode(issueId)}>
          Generate Code
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleCommitCode(issueId)}>
          Commit Code
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleGitPush(issueId)}>
          Git Push
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CreatePullRequestButton issueId={issueId} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
