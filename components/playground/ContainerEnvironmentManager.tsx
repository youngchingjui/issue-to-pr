"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  getRunningContainers,
  launchAgentBaseContainer,
  stopContainer,
} from "@/lib/actions/docker"
import { toast } from "@/lib/hooks/use-toast"

interface ContainerEnv {
  id: string
  name: string
  image: string
  status: string
}

interface Props {
  selectedRepo: string
}

export default function ContainerEnvironmentManager({ selectedRepo }: Props) {
  const router = useRouter()
  const [containers, setContainers] = useState<ContainerEnv[]>([])
  const [copying, setCopying] = useState<string | null>(null)

  const refreshContainers = async () => {
    const result = await getRunningContainers()
    setContainers(result)
  }

  const launchContainer = async () => {
    await launchAgentBaseContainer()
    await refreshContainers()
    router.refresh()
  }

  const handleStop = async (name: string) => {
    await stopContainer(name)
    await refreshContainers()
    router.refresh()
  }

  const handleCopyRepo = async (containerName: string) => {
    if (!selectedRepo) return
    setCopying(containerName)
    try {
      const resp = await fetch("/api/playground/copy-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoFullName: selectedRepo, containerName }),
      })
      const json = await resp.json()
      if (resp.ok && json.success) {
        toast({ description: `Copied repo to ${containerName}` })
      } else {
        toast({
          description: json.error || `Failed to copy repo to ${containerName}`,
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({ description: String(err), variant: "destructive" })
    } finally {
      setCopying(null)
      await refreshContainers()
    }
  }

  useEffect(() => {
    refreshContainers()
  }, [])

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Running Containers</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" onClick={refreshContainers}>
            Refresh
          </Button>
          <Button size="sm" onClick={launchContainer}>
            Launch new container
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {containers.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.image}</TableCell>
                <TableCell>{c.status}</TableCell>
                <TableCell className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleStop(c.name)}
                  >
                    Stop
                  </Button>
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!selectedRepo || copying === c.name}
                            onClick={() => handleCopyRepo(c.name)}
                          >
                            {copying === c.name
                              ? "Copying..."
                              : "Copy to Container"}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {selectedRepo
                          ? copying === c.name
                            ? "Copying repository into the container..."
                            : "Copy the selected repo into this container"
                          : "Select a repository to copy"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            ))}
            {containers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-sm text-muted-foreground"
                >
                  No running containers
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
