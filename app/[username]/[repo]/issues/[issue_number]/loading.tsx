import { Skeleton } from "@/components/ui/skeleton"

export default function IssueLoading() {
  return (
    <main className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="space-y-4">
          <Skeleton className="h-8 w-[300px]" />
          <Skeleton className="h-6 w-[400px]" />
        </div>
        <Skeleton className="h-10 w-[120px]" />
      </div>

      <div className="space-y-4">
        {/* Issue metadata */}
        <div className="flex gap-4 mb-6">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-32" />
        </div>

        {/* Issue body */}
        <Skeleton className="h-40 w-full" />

        {/* Workflow section */}
        <div className="mt-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </main>
  )
}
