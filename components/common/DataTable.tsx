import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DataTableProps<T> {
  title: string
  items: T[]
  renderRow: (item: T) => React.ReactNode
  emptyMessage?: string
}

export default function DataTable<T>({
  title,
  items,
  renderRow,
  emptyMessage = "No items found.",
}: DataTableProps<T>) {
  if (items.length === 0) {
    return <p className="text-center py-4">{emptyMessage}</p>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-full">{title}</TableHead>
            <TableHead className="w-[150px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{items.map((item) => renderRow(item))}</TableBody>
      </Table>
    </div>
  )
}
