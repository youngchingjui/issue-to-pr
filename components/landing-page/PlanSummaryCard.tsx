import { CheckCircle } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const summaryItems: string[] = [
  "Connect live workflow runs (commentOnIssue / resolveIssue) to each issue row.",
  "Extend backend IssueWithStatus with activeWorkflows details.",
  "Bubble data to frontend & display animated status icons.",
  "Icons pulse to show a running workflow at a glance.",
  "Grounded in lib/github/issues.ts, services/workflow.ts, StatusIndicators.tsx.",
]

export default function PlanSummaryCard() {
  return (
    <Card className="w-full max-w-xl mx-auto bg-white border-muted-foreground/30">
      <CardHeader>
        <CardTitle>Implementation Plan Snapshot</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-none space-y-3">
          {summaryItems.map((item) => (
            <li key={item} className="flex gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-1" />
              <span className="text-sm">{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
