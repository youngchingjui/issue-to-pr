import { Suspense } from "react"
import IssueTable from "@/components/IssueTable"
import { TableSkeleton } from "@/components/TableSkeleton"

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Repository Issues</h1>
      <Suspense fallback={<TableSkeleton />}>
        <IssueTable />
      </Suspense>
    </main>
  )
}

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <div className="text-center py-4 text-red-500">
      <h2 className="text-lg font-bold mb-2">An error occurred:</h2>
      <p>{error.message}</p>
    </div>
  )
}
