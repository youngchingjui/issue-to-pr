"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type DebugState = {
  userId: string | null
  tokenKey: string | null
  ttlSeconds: number | null
  token: Record<string, unknown>
}

export default function OAuthTokenCard({ token }: { token: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [state, setState] = useState<DebugState | null>(null)
  const [ttlSeconds, setTtlSeconds] = useState<string>("")
  const [deltaSeconds, setDeltaSeconds] = useState<string>("")
  const [unixSeconds, setUnixSeconds] = useState<string>("")

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(token)
    } finally {
      setOpen(true)
      setTimeout(() => setOpen(false), 1200)
    }
  }

  const fetchDebug = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/auth-debug")
      const data = await res.json()
      setState(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDebug().catch(() => {})
  }, [fetchDebug])

  const tokenPreview = useMemo(() => {
    try {
      const obj = JSON.parse(atob(token.split(".")[1] || ""))
      return JSON.stringify(obj, null, 2)
    } catch {
      return token
    }
  }, [token])

  async function post(action: string, body: Record<string, unknown> = {}) {
    setLoading(true)
    try {
      const res = await fetch("/api/auth-debug", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      })
      const data = await res.json()
      await fetchDebug()
      return data
    } finally {
      setLoading(false)
    }
  }

  const now = Math.floor(Date.now() / 1000)
  const expiresAt = state?.token?.expires_at as number | undefined
  const expiresIn = state?.token?.expires_in as number | undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auth Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Access Token (click to copy)</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <div
                onClick={copyToken}
                className="cursor-pointer select-all rounded border bg-muted p-2 font-mono text-xs break-all"
              >
                {token}
              </div>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-auto text-sm text-center">
              Token copied
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid gap-2">
          <Label>JWT Payload Preview</Label>
          <pre className="whitespace-pre-wrap break-words rounded bg-muted p-2 text-xs overflow-auto max-h-48">
            {tokenPreview}
          </pre>
        </div>

        <div className="grid gap-1 text-sm">
          <div>
            <b>User ID</b>: {state?.userId ?? "-"}
          </div>
          <div>
            <b>Redis Key</b>: {state?.tokenKey ?? "-"}
          </div>
          <div>
            <b>Redis TTL</b>: {state?.ttlSeconds ?? "-"}s
          </div>
          <div>
            <b>expires_at</b>: {expiresAt ?? "-"}{" "}
            {expiresAt ? `(in ${expiresAt - now}s)` : ""}
          </div>
          <div>
            <b>expires_in</b>: {expiresIn ?? "-"}s
          </div>
        </div>

        <div className="flex items-end gap-2">
          <div className="grid gap-1">
            <Label htmlFor="ttl">Set Redis TTL (seconds)</Label>
            <Input
              id="ttl"
              type="number"
              value={ttlSeconds}
              onChange={(e) => setTtlSeconds(e.target.value)}
              placeholder="e.g. 30"
            />
          </div>
          <Button
            disabled={loading || !ttlSeconds}
            onClick={() => post("set-ttl", { ttlSeconds: Number(ttlSeconds) })}
          >
            Apply TTL
          </Button>
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => post("expire")}
          >
            Expire Now
          </Button>
          <Button
            variant="destructive"
            disabled={loading}
            onClick={() => post("delete")}
          >
            Delete Cache
          </Button>
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => post("bump-expiry")}
          >
            Bump TTL to 60s
          </Button>
        </div>

        <div className="flex items-end gap-2">
          <div className="grid gap-1">
            <Label htmlFor="delta">Set expires_at via deltaSeconds</Label>
            <Input
              id="delta"
              type="number"
              value={deltaSeconds}
              onChange={(e) => setDeltaSeconds(e.target.value)}
              placeholder="e.g. 10"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="unix">Set expires_at via unixSeconds</Label>
            <Input
              id="unix"
              type="number"
              value={unixSeconds}
              onChange={(e) => setUnixSeconds(e.target.value)}
              placeholder={`${now + 30}`}
            />
          </div>
          <Button
            disabled={loading || (!deltaSeconds && !unixSeconds)}
            onClick={() =>
              post("set-expires-at", {
                deltaSeconds: deltaSeconds ? Number(deltaSeconds) : undefined,
                unixSeconds: unixSeconds ? Number(unixSeconds) : undefined,
              })
            }
          >
            Apply expires_at
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => fetchDebug()}
          >
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
