import SafariStreamingPaint from "@/components/system/SafariStreamingPaint"
import Skeleton from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <main className="container mx-auto p-4">
      <SafariStreamingPaint />
      <div className="flex justify-between items-center mb-4 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="flex items-center gap-3">
          {/* Branch selector skeleton */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-60" />
          </div>
        </div>
      </div>

      {/* New task input skeleton */}
      <section className="mb-6 grid gap-4 border-b border-muted pb-6">
        <Skeleton className="h-[35vh] w-full" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </section>

      {/* Issues table skeleton */}
      <div className="rounded-md border p-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </main>
  )
}
