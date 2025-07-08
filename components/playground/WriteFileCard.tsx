"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { writeFileInContainer } from "@/lib/docker"

export default function WriteFileCard() {
  const [containerName, setContainerName] = useState("")
  const [workingDir, setWorkingDir] = useState("/workspace")
  const [relativeFilePath, setRelativeFilePath] = useState("")
  const [fileContents, setFileContents] = useState("")
  const [makeDirs, setMakeDirs] = useState(true)
  const [output, setOutput] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleWriteFile = async () => {
    setErrorMsg(null)
    setOutput(null)

    // Basic validation
    if (!containerName.trim()) {
      setErrorMsg("Please provide a container name.")
      return
    }
    if (!workingDir.trim()) {
      setErrorMsg("Please provide a working directory.")
      return
    }
    if (!relativeFilePath.trim()) {
      setErrorMsg("Please provide a relative file path.")
      return
    }

    startTransition(async () => {
      try {
        const { stdout, stderr, exitCode } = await writeFileInContainer({
          name: containerName,
          workdir: workingDir,
          relPath: relativeFilePath,
          contents: fileContents,
          makeDirs,
        })

        if (exitCode !== 0) {
          setErrorMsg(stderr || `Exited with code ${exitCode}`)
        } else {
          setOutput(stdout || "File written successfully.")
        }
      } catch (e: unknown) {
        setErrorMsg(`An error occurred: ${e}`)
      }
    })
  }

  return (
    <Card className="max-w-2xl w-full mx-auto mb-4 bg-white/70 border border-dashed border-slate-300 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Write File to Container</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label
              htmlFor="containerNameInput"
              className="text-sm font-medium text-muted-foreground"
            >
              Container Name
            </Label>
            <Input
              id="containerNameInput"
              value={containerName}
              onChange={(e) => setContainerName(e.target.value)}
              placeholder="my-container"
              disabled={isPending}
              className="mt-1"
            />
          </div>

          <div>
            <Label
              htmlFor="workingDirInput"
              className="text-sm font-medium text-muted-foreground"
            >
              Working Directory
            </Label>
            <Input
              id="workingDirInput"
              value={workingDir}
              onChange={(e) => setWorkingDir(e.target.value)}
              placeholder="/workspace"
              disabled={isPending}
              className="mt-1"
            />
          </div>

          <div>
            <Label
              htmlFor="relativeFilePathInput"
              className="text-sm font-medium text-muted-foreground"
            >
              Relative File Path
            </Label>
            <Input
              id="relativeFilePathInput"
              value={relativeFilePath}
              onChange={(e) => setRelativeFilePath(e.target.value)}
              placeholder="subdir/file.txt"
              disabled={isPending}
              className="mt-1"
            />
          </div>

          <div>
            <Label
              htmlFor="fileContentsInput"
              className="text-sm font-medium text-muted-foreground"
            >
              File Contents
            </Label>
            <Textarea
              id="fileContentsInput"
              value={fileContents}
              onChange={(e) => setFileContents(e.target.value)}
              placeholder="Enter the file contents here..."
              disabled={isPending}
              rows={10}
              className="mt-1"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="makeDirsCheckbox"
              checked={makeDirs}
              onCheckedChange={(checked) => setMakeDirs(Boolean(checked))}
              disabled={isPending}
            />
            <Label
              htmlFor="makeDirsCheckbox"
              className="text-sm font-medium text-muted-foreground"
            >
              Create parent directories if they don&apos;t exist
            </Label>
          </div>

          <Button
            onClick={handleWriteFile}
            disabled={isPending}
            type="button"
            className="w-full"
          >
            {isPending ? "Writing File..." : "Write File"}
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
