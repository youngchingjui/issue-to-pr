import { CheckCircle } from "lucide-react"
import type { ReactNode } from "react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"

const summaryItems: ReactNode[] = [
  <>
    Augment <code>components/common/DataTable.tsx</code> with a{" "}
    <code>sortableColumns</code> prop and a private{" "}
    <code>handleSort(columnKey)</code> function.
  </>,
  <>
    Create <code>lib/hooks/use-table-sort.ts</code> to persist sort state to the
    URL via <code>useSearchParams</code> (Next.js 13).
  </>,
  <>
    Refactor both <code>components/issues/IssueTable.tsx</code> and{" "}
    <code>components/pull-requests/PullRequestTable.tsx</code> to pass{" "}
    <code>sortableColumns</code> and consume the active sort config.
  </>,
  <>
    Expose a new <code>listIssues(&#123; sort &#125;)</code> helper in{" "}
    <code>lib/neo4j/repositories/issue.ts</code> that issues an{" "}
    <code>ORDER BY i.&#123;field&#125; &#123;direction&#125;</code> Cypher
    clause.
  </>,
  <>
    Add <code>__tests__/components/IssueTable.sort.test.tsx</code> to verify
    that clicking a column header toggles sort direction and persists across
    reloads.
  </>,
]

export default function PlanSummaryCard() {
  return (
    <Card className="w-full max-w-xl mx-auto bg-white border-muted-foreground/30 p-2 shadow-lg">
      <CardHeader className="pb-1 px-2 pt-2">
        <span className="text-xs uppercase text-muted-foreground">
          the plan (as per your codebase)
        </span>
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-1">
        <ul className="list-none space-y-3">
          {summaryItems.map((item, idx) => (
            <li key={idx} className="flex gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-1" />
              <span className="text-sm">{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
