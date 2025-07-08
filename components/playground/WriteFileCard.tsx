"use client"

import { useState, useTransition } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { writeFileToContainer } from "@/lib/actions/docker"

export default function WriteFileCard() {
  const [containerName, setContainerName] = useState("")
  const [workdir, setWorkdir] = useState("/workspace")
  const [filePath, setFilePath] = useState("")
  const [fileContents, setFileContents] = useState("")
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleWriteFile = () => {
    setResult(null)
    setError(null)
    if (!containerName.trim() || !workdir.trim() || !filePath.trim()) {
      setError("Container name, workdir, and file path are required.")
      return
    }
    startTransition(async () => {
      const { result, error } = await writeFileToContainer({
        name: containerName,
        workdir,
        relativePath: filePath,
        contents: fileContents,
      })
      setResult(result)
      setError(error)
    })
  }

  return (
    <Card className="max-w-2xl w-full mx-auto mb-4 bg-white/70 border border-dashed border-slate-300 shadow-sm">
      <CardHeader>
        <CardTitle>Write File in Docker Container</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label htmlFor="containerName" className="block text-sm font-medium text-muted-foreground mb-1">Container Name</label>
            <Input
              id="containerName"
              value={containerName}
              onChange={e => setContainerName(e.target.value)}
              placeholder="my-container"
              disabled={isPending}
            />
          </div>
          <div>
            <label htmlFor="workdir" className="block text-sm font-medium text-muted-foreground mb-1">Working Directory (absolute)</label>
            <Input
              id="workdir"
              value={workdir}
              onChange={e => setWorkdir(e.target.value)}
              placeholder="/workspace"
              disabled={isPending}
            />
          </div>
          <div>
            <label htmlFor="filePath" className="block text-sm font-medium text-muted-foreground mb-1">File Path (relative to workdir)</label>
            <Input
              id="filePath"
              value={filePath}
              onChange={e => setFilePath(e.target.value)}
              placeholder="app.txt, subdir/readme.md, etc."
              disabled={isPending}
            />
          </div>
          <div>
            <label htmlFor="fileContents" className="block text-sm font-medium text-muted-foreground mb-1">File Contents</label>
            <Textarea
              id="fileContents"
              value={fileContents}
              onChange={e => setFileContents(e.target.value)}
              rows={8}
              placeholder="Paste or type file contents here..."
              disabled={isPending}
            />
          </div>
          <Button onClick={handleWriteFile} disabled={isPending}>
            {isPending ? "Writing..." : "Write File"}
          </Button>
          {result && (
            <div className="mt-3 text-green-700 bg-green-100 p-2 rounded text-sm border border-green-200">{result}</div>
          )}
          {error && (
            <div className="mt-3 text-red-700 bg-red-100 p-2 rounded text-sm border border-red-200">{error}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
