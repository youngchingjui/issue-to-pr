import Link from "next/link"
import PlanEvalCard from "@/components/playground/PlanEvalCard"
import { Button } from "@/components/ui/button"

export default function EvalsPage() {
  return (
    <div className="container mx-auto py-8 space-y-4">
      <div>
        <h1 className="text-3xl font-bold mb-2">LLM Evaluations</h1>
        <p className="text-muted-foreground">
          This page will run LLM-as-Judge evaluations on various workflows.
        </p>
      </div>
      <p>
        Evaluations will score each workflow run on custom questions and return
        structured results.
      </p>
      <PlanEvalCard />
      <Link href="/playground">
        <Button variant="secondary" size="sm">
          Back to Playground
        </Button>
      </Link>
    </div>
  )
}
