"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "@/lib/hooks/use-toast"
import { runLsInContainerWithDockerode } from "@/lib/actions/dockerode-exec"

export default function DockerodeExecCard() {
  const [containerName, setContainerName] = useState("")
  const [output, setOutput] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleExec = async () => {
    setErrorMsg(null)
    setOutput(null)
    if (!containerName.trim()) {
      setErrorMsg("Please provide a container name.")
      return
    }
    startTransition(async () => {
      try {
        const { result, error } = await runLsInContainerWithDockerode(containerName)
        if (error) {
          setErrorMsg(error)
        } else {
          setOutput(result || "No output.")
        }
      } catch (e: any) {
        setErrorMsg(e?.message || "An error occurred")
      }
    })
  }

  return (
    <Card className="max-w-md w-full mx-auto mb-4 bg-white/70 border border-dashed border-slate-300 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Dockerode: <code>ls -la</code> in Container</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-muted-foreground" htmlFor="containerNameInput">
            Container Name
          </label>
          <Input
            id="containerNameInput"
            value={containerName}
            onChange={e => setContainerName(e.target.value)}
            placeholder="my-container"
            disabled={isPending}
            autoFocus
            className="mb-2"
          />
          <Button onClick={handleExec} loading={isPending} disabled={isPending} type="button">
            {isPending ? "Running..." : "Run ls -la"}
          </Button>
          {output !== null && (
            <pre className="mt-4 p-3 bg-slate-100 text-xs rounded overflow-x-auto mb-2 border border-slate-100">
              {output}
            </pre>
          )}
          {errorMsg && (
            <div className="mt-2 text-sm text-red-600 break-words">
              {errorMsg}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
