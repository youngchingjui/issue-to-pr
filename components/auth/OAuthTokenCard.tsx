"use client"

import { useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export default function OAuthTokenCard({ token }: { token: string }) {
  const [open, setOpen] = useState(false)

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(token)
    } finally {
      setOpen(true)
      setTimeout(() => setOpen(false), 1200)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>OAuth Token</CardTitle>
      </CardHeader>
      <CardContent>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div
              onClick={copyToken}
              className="cursor-pointer select-all rounded border bg-muted p-2 font-mono text-sm break-all"
            >
              {token}
            </div>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-auto text-sm text-center">
            OAuth token copied
          </PopoverContent>
        </Popover>
      </CardContent>
    </Card>
  )
}
