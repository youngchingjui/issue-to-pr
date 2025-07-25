"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAppInstallations, listReposForInstallation } from "@/lib/utils/asdf"

export default function TestInstallationsCard() {
  const [installations, setInstallations] = useState<unknown[] | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleTest = () => {
    setErrorMsg(null)
    setInstallations(null)

    startTransition(async () => {
      try {
        const data = await getAppInstallations()
        setInstallations(data as unknown[])
      } catch (e: unknown) {
        setErrorMsg(
          e instanceof Error ? e.message : "An unknown error occurred."
        )
      }
    })
  }

  const handleListRepos = () => {
    setErrorMsg(null)
    setInstallations(null)

    startTransition(async () => {
      try {
        const data = await listReposForInstallation()
        setInstallations(data)
      } catch (e: unknown) {
        setErrorMsg(
          e instanceof Error ? e.message : "An unknown error occurred."
        )
      }
    })
  }

  return (
    <Card className="max-w-md w-full mx-auto mb-4 bg-white/70 border border-dashed border-slate-300 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">
          GitHub App: List Installations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button onClick={handleTest} disabled={isPending} type="button">
            {isPending ? "Testing…" : "Test Installations"}
          </Button>
          <Button onClick={handleListRepos} disabled={isPending} type="button">
            {isPending ? "Listing…" : "List Repos"}
          </Button>
        </div>
        {errorMsg && (
          <div className="mt-2 text-sm text-red-600 break-words">
            {errorMsg}
          </div>
        )}
        {installations && (
          <pre className="mt-4 p-3 bg-slate-100 text-xs rounded overflow-x-auto mb-2 border border-slate-100 max-h-96">
            {JSON.stringify(installations, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  )
}
