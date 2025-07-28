"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getGraphQLClient,
  getInstallationPermissions,
  getTestInstallationOctokit,
  getUserInstallations,
  getUserOctokit,
} from "@/lib/github"
import { createIssue } from "@/lib/github/issues"
import {
  getInstallationFromRepo,
  listUserAppRepositories,
} from "@/lib/github/repos"
import {
  checkRepoPermissions,
  getGithubUser,
  listUserRepositoriesGraphQL,
} from "@/lib/github/users"

const FUNCTION_OPTIONS = [
  {
    label: "getGithubUser (no params)",
    value: "getGithubUser",
    params: [],
  },
  {
    label: "checkRepoPermissions (repoFullName: string)",
    value: "checkRepoPermissions",
    params: [
      { name: "repoFullName", type: "string", placeholder: "owner/repo" },
    ],
  },
  {
    label: "listUserRepositoriesGraphQL (no params)",
    value: "listUserRepositoriesGraphQL",
    params: [],
  },
  {
    label: "listUserAppRepositories (no params)",
    value: "listUserAppRepositories",
    params: [],
  },
  {
    label: "getRepoInstallation (owner: string, repo: string)",
    value: "getRepoInstallation",
    params: [
      { name: "owner", type: "string", placeholder: "owner" },
      { name: "repo", type: "string", placeholder: "repo" },
    ],
  },
  {
    label: "getGraphQLClient (no params)",
    value: "getGraphQLClient",
    params: [],
  },
  {
    label: "getInstallationPermissions (no params)",
    value: "getInstallationPermissions",
    params: [],
  },
  {
    label: "getTestInstallationOctokit (installationId?: number)",
    value: "getTestInstallationOctokit",
    params: [
      { name: "installationId", type: "number", placeholder: "77503233" },
    ],
  },
  {
    label: "getUserOctokit (no params)",
    value: "getUserOctokit",
    params: [],
  },
  {
    label: "getUserInstallations (no params)",
    value: "getUserInstallations",
    params: [],
  },
  {
    label: "createIssue (repo, owner, title, body)",
    value: "createIssue",
    params: [
      { name: "repo", type: "string", placeholder: "issue-to-pr" },
      { name: "owner", type: "string", placeholder: "youngchingjui" },
      { name: "title", type: "string", placeholder: "test title" },
      { name: "body", type: "string", placeholder: "test body" },
    ],
  },
]

export default function TestGithubUserFunctionsCard() {
  const [selectedFn, setSelectedFn] = useState(FUNCTION_OPTIONS[0])
  const [paramValues, setParamValues] = useState<{ [key: string]: string }>({})
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleFnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fn = FUNCTION_OPTIONS.find((f) => f.value === e.target.value)
    setSelectedFn(fn || FUNCTION_OPTIONS[0])
    setParamValues({})
    setResult(null)
    setError(null)
  }

  const handleParamChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    param: string
  ) => {
    setParamValues((prev) => ({ ...prev, [param]: e.target.value }))
  }

  const handleRun = () => {
    setResult(null)
    setError(null)
    startTransition(async () => {
      try {
        let res: unknown
        if (selectedFn.value === "getGithubUser") {
          res = await getGithubUser()
        } else if (selectedFn.value === "checkRepoPermissions") {
          res = await checkRepoPermissions(paramValues["repoFullName"] || "")
        } else if (selectedFn.value === "listUserRepositoriesGraphQL") {
          res = await listUserRepositoriesGraphQL()
        } else if (selectedFn.value === "getGraphQLClient") {
          res = await getGraphQLClient()
        } else if (selectedFn.value === "getInstallationPermissions") {
          res = await getInstallationPermissions()
        } else if (selectedFn.value === "getTestInstallationOctokit") {
          const installationId = paramValues["installationId"]
            ? parseInt(paramValues["installationId"])
            : undefined
          res = await getTestInstallationOctokit(installationId)
        } else if (selectedFn.value === "getUserOctokit") {
          res = await getUserOctokit()
        } else if (selectedFn.value === "getUserInstallations") {
          res = await getUserInstallations()
        } else if (selectedFn.value === "listUserAppRepositories") {
          res = await listUserAppRepositories()
        } else if (selectedFn.value === "getRepoInstallation") {
          const owner = paramValues["owner"] || ""
          const repo = paramValues["repo"] || ""
          res = await getInstallationFromRepo({ owner, repo })
        } else if (selectedFn.value === "createIssue") {
          const repo = paramValues["repo"] || ""
          const owner = paramValues["owner"] || ""
          const title = paramValues["title"] || ""
          const body = paramValues["body"] || ""
          res = await createIssue({ repo, owner, title, body })
        }
        setResult(res)
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError(String(err))
        }
      }
    })
  }

  return (
    <Card className="max-w-2xl w-full mx-auto mb-4 bg-white/70 border border-dashed border-slate-300 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Test GitHub User Functions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="functionSelect">Function</Label>
            <select
              id="functionSelect"
              className="block w-full mt-1 border rounded px-2 py-1"
              value={selectedFn.value}
              onChange={handleFnChange}
              disabled={isPending}
            >
              {FUNCTION_OPTIONS.map((fn) => (
                <option key={fn.value} value={fn.value}>
                  {fn.label}
                </option>
              ))}
            </select>
          </div>
          {selectedFn.params.length > 0 && (
            <div className="space-y-2">
              {selectedFn.params.map((param) => (
                <div key={param.name}>
                  <Label htmlFor={param.name}>{param.name}</Label>
                  <Input
                    id={param.name}
                    type={param.type}
                    placeholder={param.placeholder}
                    value={paramValues[param.name] || ""}
                    onChange={(e) => handleParamChange(e, param.name)}
                    disabled={isPending}
                  />
                </div>
              ))}
            </div>
          )}
          <Button onClick={handleRun} disabled={isPending}>
            Run
          </Button>
          {result !== null && result !== undefined && (
            <pre className="mt-4 p-2 bg-slate-100 rounded text-xs overflow-x-auto max-h-64">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
          {error && (
            <div className="mt-2 p-3 bg-red-50 text-sm text-red-600 rounded border border-red-200 break-words">
              {error}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
