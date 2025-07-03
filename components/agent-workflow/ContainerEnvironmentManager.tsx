"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getRunningContainers } from "@/lib/actions/docker"

interface ContainerEnv {
  id: string
  name: string
  image: string
  status: string
}

export default function ContainerEnvironmentManager() {
  const [containers, setContainers] = useState<ContainerEnv[]>([])

  const refreshContainers = async () => {
    const result = await getRunningContainers()
    setContainers(result)
  }

  useEffect(() => {
    refreshContainers()
  }, [])

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Running Containers</CardTitle>
        <Button size="sm" onClick={refreshContainers}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {containers.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.image}</TableCell>
                <TableCell>{c.status}</TableCell>
              </TableRow>
            ))}
            {containers.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                  No running containers
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
