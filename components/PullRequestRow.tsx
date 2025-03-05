"use client"

import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { useState } from "react"

import AnalyzePRButton from "@/components/AnalyzePRButton"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { PullRequest } from "@/lib/types"
import { getApiKeyFromLocalStorage } from "@/lib/utils"

export function PullRequestRow({ pr }: { pr: PullRequest }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleReviewPullRequest = async (
    pullNumber: number,
    repoFullName: string
  ) => {
    // Pull API key if recently saved
    const key = getApiKeyFromLocalStorage()
    if (!key) {
      toast({
        title: "API key not found",
        description: "Please save an OpenAI API key first.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    const response = await fetch("/api/review", {
      method: "POST",
      body: JSON.stringify({ pullNumber, repoFullName, apiKey: key }),
    })
    console.log(response)
    setIsLoading(false)
  }

  return (
    <TableRow key={pr.id}>
      <TableCell className="py-4">
        <div className="flex flex-col gap-1">
          <div className="font-medium text-base">
            <Link
              href={`https://github.com/${pr.head.repo.full_name}/pull/${pr.number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {pr.title}
            </Link>
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span>#{pr.number}</span>
            <span>•</span>
            <span>{pr.user.login}</span>
            <span>•</span>
            <span>{pr.state}</span>
            <span>•</span>
            <span>
              Updated{" "}
              {formatDistanceToNow(new Date(pr.updated_at), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <AnalyzePRButton
            repoFullName={pr.head.repo.full_name}
            pullNumber={pr.number}
          />
          <Button
            onClick={() =>
              handleReviewPullRequest(pr.number, pr.head.repo.full_name)
            }
            disabled={isLoading}
            variant="default"
          >
            {isLoading ? "Reviewing PR..." : "Review Pull Request"}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
