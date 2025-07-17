"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { runApplyPatch } from "@/lib/actions/applyPatch"

export default function ApplyPatchCard() {
  const [containerName, setContainerName] = useState("")
  const [workingDir, setWorkingDir] = useState("/workspace")
  const [filePath, setFilePath] = useState("")
  const [patchText, setPatchText] = useState("")
  const [output, setOutput] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleApplyPatch = async () => {
    setErrorMsg(null)
    setOutput(null)

    if (!containerName.trim()) {
      setErrorMsg("Please provide a container name.")
      return
    }
    if (!workingDir.trim()) {
      setErrorMsg("Please provide a working directory.")
      return
    }
    if (!filePath.trim()) {
      setErrorMsg("Please provide a file path.")
      return
    }
    if (!patchText.trim()) {
      setErrorMsg("Please provide a patch string.")
      return
    }

    startTransition(async () => {
      const result = await runApplyPatch({
        containerName,
        workdir: workingDir,
        filePath,
        patch: patchText,
      })
      if (result.status === "ok") {
        setOutput(result.message)
      } else {
        setErrorMsg(result.message)
      }
    })
  }

  return (
    <Card className="max-w-2xl w-full mx-auto mb-4 bg-white/70 border border-dashed border-slate-300 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Apply Patch</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label
              htmlFor="apContainerNameInput"
              className="text-sm font-medium text-muted-foreground"
            >
              Container Name
            </Label>
            <Input
              id="apContainerNameInput"
              value={containerName}
              onChange={(e) => setContainerName(e.target.value)}
              placeholder="my-container"
              disabled={isPending}
              className="mt-1"
            />
          </div>
          <div>
            <Label
              htmlFor="apWorkingDirInput"
              className="text-sm font-medium text-muted-foreground"
            >
              Working Directory
            </Label>
            <Input
              id="apWorkingDirInput"
              value={workingDir}
              onChange={(e) => setWorkingDir(e.target.value)}
              placeholder="/workspace"
              disabled={isPending}
              className="mt-1"
            />
          </div>
          <div>
            <Label
              htmlFor="apFilePathInput"
              className="text-sm font-medium text-muted-foreground"
            >
              File Path
            </Label>
            <Input
              id="apFilePathInput"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="src/index.ts"
              disabled={isPending}
              className="mt-1"
            />
          </div>
          <div>
            <Label
              htmlFor="apPatchText"
              className="text-sm font-medium text-muted-foreground"
            >
              Patch Text
            </Label>
            <Textarea
              id="apPatchText"
              value={patchText}
              onChange={(e) => setPatchText(e.target.value)}
              placeholder="@@ ..."
              rows={10}
              disabled={isPending}
              className="mt-1"
            />
          </div>
          <Button
            onClick={handleApplyPatch}
            disabled={isPending}
            type="button"
            className="w-full"
          >
            {isPending ? "Applying Patch..." : "Apply Patch"}
          </Button>
          {output !== null && (
            <pre className="mt-4 p-3 bg-green-50 text-xs rounded overflow-x-auto mb-2 border border-green-200 text-green-800">
              {output}
            </pre>
          )}
          {errorMsg && (
            <div className="mt-2 p-3 bg-red-50 text-sm text-red-600 rounded border border-red-200 break-words">
              {errorMsg}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
