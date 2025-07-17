"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { generateIssueTitle } from "@/lib/actions/issueTitle"

export default function IssueTitleCard() {
  const [description, setDescription] = useState("")
  const [title, setTitle] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleGenerate = () => {
    if (!description.trim()) return
    startTransition(async () => {
      const t = await generateIssueTitle(description)
      setTitle(t)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Description → Title</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Paste GitHub issue description..."
          rows={6}
        />
        <Button onClick={handleGenerate} disabled={isPending || !description.trim()}>
          {isPending ? "Generating..." : "Generate Title"}
        </Button>
        {title && <Input readOnly value={title} className="font-medium" />}
      </CardContent>
    </Card>
  )
}

