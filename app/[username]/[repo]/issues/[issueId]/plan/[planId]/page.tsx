import { notFound } from "next/navigation"

import { PlanDetail } from "@/components/plans/PlanDetail"
import { n4j } from "@/lib/neo4j/service"
interface PageProps {
  params: {
    planId: string
  }
}

export default async function PlanPage({ params }: PageProps) {
  const { planId } = params
  const plan = await n4j.getPlanWithDetails(planId)

  if (!plan) {
    notFound()
  }

  // TODO: Roll up PlanDetail component into this file, no need for separate component
  return (
    <div className="flex min-h-screen items-start justify-center py-8 px-4">
      <PlanDetail plan={plan} />
    </div>
  )
}
