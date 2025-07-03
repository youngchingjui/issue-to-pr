"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { CheckCircleIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { listUserRepositoriesGraphQL } from "@/lib/github/users"
import { useMediaQuery } from "@/lib/hooks/use-media-query"
import { RepoSelectorItem } from "@/lib/types/github"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CopyMarkdownButton } from "@/components/workflow-runs/events/CopyMarkdownButton"

// Dynamic import for the server action
const checkLocalRepo = (
  repoFullName: string
): Promise<{ exists: boolean; path: string }> =>
  import("./checkLocalRepo.server").then((mod) => mod.checkLocalRepo(repoFullName))

interface Props {
  selectedRepo: string
}

type RepoWithStatus = RepoSelectorItem & {
  localRepo?: { exists: boolean; path: string }
}

export default function RepoSelector({ selectedRepo }: Props) {
  const router = useRouter()
  const [repos, setRepos] = useState<RepoWithStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const isDesktop = useMediaQuery("md")
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (open && repos.length === 0 && !loading) {
      setLoading(true)
      listUserRepositoriesGraphQL()
        .then((data) => setRepos(data))
        .finally(() => setLoading(false))
    }
  }, [open, repos.length, loading])

  // On dropdown open, fetch local status in parallel for all repos
  useEffect(() => {
    if (open && repos.length > 0 && !checking && !repos.some(r => r.localRepo)) {
      setChecking(true)
      Promise.all(
        repos.map(async (repo) => {
          try {
            const res = await checkLocalRepo(repo.nameWithOwner)
            return { ...repo, localRepo: res }
          } catch {
            return { ...repo, localRepo: { exists: false, path: "" } }
          }
        })
      ).then((withStatus) => {
        setRepos(withStatus)
      }).finally(() => setChecking(false))
    }
  }, [open, repos, checking])

  return (
    <Select
      defaultValue={selectedRepo}
      name="repo"
      onValueChange={(val) => {
        router.push(`/issues?repo=${encodeURIComponent(val)}`)
      }}
      onOpenChange={setOpen}
    >
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Select repository">
          {selectedRepo}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align={isDesktop ? "end" : "start"}>
        {loading && <div className="px-4 py-2">Loading...</div>}
        {!loading &&
          repos.map((repo) => (
            <SelectItem key={repo.nameWithOwner} value={repo.nameWithOwner}>
              <span className="flex items-center gap-2">
                {repo.nameWithOwner}
                {repo.localRepo && repo.localRepo.exists ? (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center cursor-pointer group">
                          <CheckCircleIcon className="ml-1 text-green-600 w-4 h-4"/>
                          {/* Copy on click; show hover effect, no event bubble out */}
                          <span className="ml-1" onClick={e => e.stopPropagation()}>
                            <CopyMarkdownButton content={repo.localRepo.path} />
                          </span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Repo saved locally in temp folder.<br />
                        Click icon to copy full path.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : repo.localRepo && repo.localRepo.exists === false ? null : null}
              </span>
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  )
}
