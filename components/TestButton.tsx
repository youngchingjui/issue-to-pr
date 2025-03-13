"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export default function TestButton() {
  const [branchName, setBranchName] = useState("main")
  const [results, setResults] = useState(false)

  return (
    <>
      <Button
        onClick={() => {
          fetch("/api/test", {
            method: "POST",
            body: JSON.stringify({ branchName }),
          })
            .then((res) => res.json())
            .then((data) => setResults(data.branchExists))
        }}
      >
        Test
      </Button>
      <p>{results ? "true" : "false"}</p>
      <Textarea
        value={branchName}
        onChange={(e) => setBranchName(e.target.value)}
      />
    </>
  )
}
