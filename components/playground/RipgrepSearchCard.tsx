"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { runRipgrepSearch } from "@/lib/actions/ripgrep"
import { RepoEnvironment } from "@/lib/types"

export default function RipgrepSearchCard() {
  const [envType, setEnvType] = useState<"host" | "container">("host")
  const [baseDir, setBaseDir] = useState("")
  const [containerName, setContainerName] = useState("")
  const [mountPath, setMountPath] = useState("")
  const [query, setQuery] = useState("")
  const [ignoreCase, setIgnoreCase] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [follow, setFollow] = useState(false)
  const [mode, setMode] = useState<"literal" | "regex">("literal")
  const [result, setResult] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const handleSubmit = async () => {
    if (!query.trim()) return
    setIsRunning(true)
    const env: RepoEnvironment =
      envType === "host"
        ? { kind: "host", root: baseDir }
        : {
            kind: "container",
            name: containerName,
            mount: mountPath || undefined,
          }

    const output = await runRipgrepSearch({
      env,
      searchParams: {
        query,
        ignoreCase,
        hidden,
        follow,
        mode,
      },
    })
    setResult(output)
    setIsRunning(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ripgrep Search</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium">Environment</p>
          <Select
            value={envType}
            onValueChange={(v) => setEnvType(v as "host" | "container")}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="host">Host</SelectItem>
              <SelectItem value="container">Container</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {envType === "host" ? (
          <div>
            <p className="mb-2 text-sm font-medium">Base Directory</p>
            <Input
              value={baseDir}
              onChange={(e) => setBaseDir(e.target.value)}
              placeholder="/path/to/repo"
            />
          </div>
        ) : (
          <>
            <div>
              <p className="mb-2 text-sm font-medium">Container Name</p>
              <Input
                value={containerName}
                onChange={(e) => setContainerName(e.target.value)}
                placeholder="container"
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Mount Path (optional)</p>
              <Input
                value={mountPath}
                onChange={(e) => setMountPath(e.target.value)}
                placeholder="/workspace"
              />
            </div>
          </>
        )}
        <div>
          <p className="mb-2 text-sm font-medium">Query</p>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={ignoreCase}
              onCheckedChange={(v) => setIgnoreCase(Boolean(v))}
            />
            Ignore Case
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={hidden}
              onCheckedChange={(v) => setHidden(Boolean(v))}
            />
            Hidden
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={follow}
              onCheckedChange={(v) => setFollow(Boolean(v))}
            />
            Follow
          </label>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Mode</p>
          <Select
            value={mode}
            onValueChange={(v) => setMode(v as "literal" | "regex")}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="literal">Literal</SelectItem>
              <SelectItem value="regex">Regex</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSubmit} disabled={isRunning}>
          {isRunning ? "Searching..." : "Search"}
        </Button>
        {result && (
          <Textarea value={result} readOnly rows={10} className="mt-4" />
        )}
      </CardContent>
    </Card>
  )
}
