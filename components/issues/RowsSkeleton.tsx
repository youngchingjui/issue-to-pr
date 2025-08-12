import { TableCell, TableRow } from "@/components/ui/table"

interface RowsSkeletonProps {
  rows?: number
  columns?: number
}

export default function RowsSkeleton({
  rows = 5,
  columns = 3,
}: RowsSkeletonProps) {
  const skeletonRows = Array.from({ length: rows })
  return (
    <>
      {skeletonRows.map((_, index) => (
        <TableRow key={`skeleton-row-${index}`}>
          <TableCell colSpan={columns}>
            <div className="h-8 w-full animate-pulse rounded bg-muted" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}
