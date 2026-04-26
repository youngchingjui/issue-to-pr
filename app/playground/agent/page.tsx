"use server"

import Link from "next/link"

import AgentCompletionCard from "@/components/playground/AgentCompletionCard"
import { Button } from "@/components/ui/button"

export default function AgentPlaygroundPage() {
  return (
    <div className="container mx-auto py-8 space-y-4">
      <AgentCompletionCard />
      <Link href="/playground">
        <Button variant="secondary" size="sm">
          Back to Playground
        </Button>
      </Link>
    </div>
  )
}
