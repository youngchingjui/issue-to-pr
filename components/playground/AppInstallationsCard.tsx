"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { listAppInstallations } from "@/lib/github"

export default function AppInstallationsCard() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFetch = () => {
    setResult(null)
    setError(null)
    startTransition(async () => {
      try {
        const installations = await listAppInstallations()
        setResult(installations)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err))
      }
    })
  }

  return (
    <Card className="max-w-2xl w-full mx-auto mb-4 bg-white/70 border border-dashed border-slate-300 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">GitHub App Installations (App Auth)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button onClick={handleFetch} disabled={isPending}>
              List All Installations
            </Button>
          </div>
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

