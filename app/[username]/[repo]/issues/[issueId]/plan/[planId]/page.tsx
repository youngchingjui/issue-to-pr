import { notFound } from "next/navigation"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import TableSkeleton from "@/components/layout/TableSkeleton"

const PlanDetail = dynamic(() => import("@/components/plans/PlanDetail"), { ssr: false })

interface Props {
  params: {
    username: string
    repo: string
    issueId: string
    planId: string
  }
}

async function fetchPlan(planId: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/plans/${planId}`)
  if (!res.ok) {
    return null
  }
  return await res.json()
}

export default async function PlanPage({ params }: Props) {
  const { username, repo, issueId, planId } = params
  const planData = await fetchPlan(planId)
  if (!planData) notFound()

  return (
    <main className="container mx-auto p-4">
      <div className="flex flex-col gap-4 max-w-2xl mx-auto">
        <Suspense fallback={<TableSkeleton />}>
          <PlanDetail
            plan={planData}
            username={username}
            repo={repo}
            issueId={issueId}
          />
        </Suspense>
      </div>
    </main>
  )
}
