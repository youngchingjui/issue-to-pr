"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"

import { ContainerCard } from "@/components/playground/ContainerCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getRunningContainers,
  launchAgentBaseContainer,
  runDevCommand,
  runInstallCommand,
  stopContainer,
} from "@/lib/actions/docker"
import { useToast } from "@/lib/hooks/use-toast"
import { RunningContainer } from "@/lib/types/docker"

export default function ContainerClientPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [containers, setContainers] = useState<RunningContainer[]>([])
  const [isRefreshing, startRefresh] = useTransition()
  const [isLaunching, startLaunching] = useTransition()
  const [_isExecuting, startExecuting] = useTransition()

  const refreshContainers = () =>
    startRefresh(async () => {
      const result = await getRunningContainers()
      setContainers(result)
    })

  const launchContainer = () =>
    startLaunching(async () => {
      await launchAgentBaseContainer()
      refreshContainers()
      router.refresh()
    })

  const handleStop = async (id: string) => {
    await stopContainer(id)
    refreshContainers()
    router.refresh()
  }

  const handleRunCommand = (id: string, name: string, command: string) => {
    if (command === "install") {
      startExecuting(async () => {
        const res = await runInstallCommand(id)
        if (res.exitCode === 0) {
          toast({
            title: "Install completed",
            description: res.stdout || "Install command executed successfully.",
          })
        } else {
          toast({
            title: "Install failed",
            description: res.stderr || "Unknown error running install.",
            variant: "destructive",
          })
        }
      })
      return
    }

    if (command === "dev") {
      startExecuting(async () => {
        const res = await runDevCommand(id)
        if (res.exitCode === 0) {
          toast({
            title: "Dev started",
            description:
              res.stdout?.trim() ||
              "Started development command in background (logs at /workspace/logs/dev.log)",
          })
        } else {
          toast({
            title: "Dev failed",
            description: res.stderr || "Unknown error running dev.",
            variant: "destructive",
          })
        }
      })
      return
    }
  }

  useEffect(() => {
    refreshContainers()
  }, [])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Agent Containers</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={refreshContainers}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button size="sm" onClick={launchContainer} disabled={isLaunching}>
              {isLaunching ? "Launching..." : "Launch container"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {containers.map((c) => (
              <ContainerCard
                key={c.id}
                id={c.id}
                name={c.name.replace(/^\//, "")}
                status={c.status}
                image={c.image}
                uptime={c.uptime}
                ports={c.ports}
                project={c.repoFullName}
                branch={c.branch}
                installAvailable={Boolean(c.hasInstallCommand)}
                devAvailable={Boolean(c.hasDevCommand)}
                settingsLink={
                  c.owner && c.repo
                    ? `/${c.owner}/${c.repo}/settings`
                    : undefined
                }
                previewSubdomain={c.subdomain}
                onRunCommand={handleRunCommand}
                onStop={() => handleStop(c.id)}
              />
            ))}
            {containers.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No running agent containers found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

