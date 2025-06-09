import React from "react"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DataTableProps {
  header: React.ReactNode
  emptyMessage?: string
  children: React.ReactNode
}

export default function DataTable({
  header,
  emptyMessage = "No items found.",
  children,
}: DataTableProps) {
  // Determine if children has any non-null, non-false child rows
  const isEmpty =
    !children ||
    (Array.isArray(children) && children.length === 0) ||
    (Array.isArray(children) && children.every(child => !child))

  if (isEmpty) {
    return <p className="text-center py-4">{emptyMessage}</p>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>{header}</TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  )
}
