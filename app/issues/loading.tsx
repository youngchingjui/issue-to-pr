import Skeleton from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl w-full py-10 px-4 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Skeleton className="h-7 w-64" />
        <div className="flex items-center gap-3">
          {/* Repo selector skeleton */}
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

