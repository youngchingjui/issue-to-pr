import { notFound } from "next/navigation"

import { PlanDetail } from "@/components/plans/PlanDetail"
import { WorkflowPersistenceService } from "@/lib/services/WorkflowPersistenceService"

interface PageProps {
  params: {
    planId: string
  }
}

export default async function PlanPage({ params }: PageProps) {
  const { planId } = params
  const service = new WorkflowPersistenceService()
  const plan = await service.getPlanById(planId)

  if (!plan) {
    notFound()
  }

  return (
    <div className="flex min-h-screen items-start justify-center py-8 px-4">
      <PlanDetail plan={plan} />
    </div>
  )
}
