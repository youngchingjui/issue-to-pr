"use client"

import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"

interface Props {
  repoFullName: string
  pullNumber: number
}

type MergeStatus = "unknown" | "conflicting" | "mergeable"

export default function MergeConflictBadge({
  repoFullName,
  pullNumber,
}: Props) {
  const [status, setStatus] = useState<MergeStatus>("unknown")

  useEffect(() => {
    let isMounted = true

    async function fetchStatus() {
      try {
        const response = await fetch("/api/github/fetch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "pull",
            number: pullNumber,
            fullName: repoFullName,
          }),
        })
        if (!response.ok) throw new Error("Failed to fetch PR details")
        const pr = await response.json()
        // GitHub REST pulls.get returns mergeable (boolean | null) and mergeable_state
        const mergeable: boolean | null = pr?.mergeable ?? null
        const mergeableState: string | undefined = pr?.mergeable_state

        let newStatus: MergeStatus = "unknown"
        if (
          mergeable === false ||
          mergeableState === "dirty" ||
          mergeableState === "blocked"
        ) {
          newStatus = "conflicting"
        } else if (mergeable === true || mergeableState === "clean") {
          newStatus = "mergeable"
        }

        if (isMounted) setStatus(newStatus)
      } catch (e) {
        // Ignore errors; keep unknown
        if (isMounted) setStatus("unknown")
        console.error(e)
      }
    }

    fetchStatus()

    return () => {
      isMounted = false
    }
  }, [repoFullName, pullNumber])

  if (status !== "conflicting") return null

  return <Badge variant="destructive">Merge conflict</Badge>
}
