import type { Meta, StoryObj } from "@storybook/nextjs"
import React, { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface RowItem {
  id: string
  name?: string
  email?: string
  loading?: boolean
}

function TableWithAddRowSkeleton() {
  const initialRows: RowItem[] = useMemo(
    () => [
      { id: "1", name: "Alice Johnson", email: "alice@example.com" },
      { id: "2", name: "Bob Smith", email: "bob@example.com" },
      { id: "3", name: "Charlie Brown", email: "charlie@example.com" },
    ],
    []
  )

  const [rows, setRows] = useState<RowItem[]>(initialRows)

  const addNewRow = () => {
    const tempId = `temp-${Date.now()}`
    // Immediately insert a skeleton row at the top for responsiveness
    setRows((prev) => [{ id: tempId, loading: true }, ...prev])

    // Simulate async data loading
    const delay = 900 + Math.round(Math.random() * 1200)
    setTimeout(() => {
      setRows((prev) =>
        prev.map((r) =>
          r.id === tempId
            ? {
                id: `${Date.now()}`,
                name: "New User",
                email: `new.user+${Math.floor(Math.random() * 1000)}@example.com`,
                loading: false,
              }
            : r
        )
      )
    }, delay)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Users</h3>
        <Button onClick={addNewRow}>Add new row</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Name</TableHead>
              <TableHead className="w-[40%]">Email</TableHead>
              <TableHead className="w-[20%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) =>
              row.loading ? (
                <TableRow key={row.id} className="opacity-90">
                  <TableCell>
                    <Skeleton className="h-4 w-1/3" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-2/3" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-8 w-20" />
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="secondary">
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

const meta: Meta<typeof TableWithAddRowSkeleton> = {
  title: "App/Table/Add row with loading skeleton",
  component: TableWithAddRowSkeleton,
  parameters: {
    layout: "padded",
  },
}

export default meta

type Story = StoryObj<typeof TableWithAddRowSkeleton>

export const Default: Story = {
  render: () => <TableWithAddRowSkeleton />,
}
