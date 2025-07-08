"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getRunningContainers,
  launchAgentBaseContainer,
  stopContainer,
} from "@/lib/docker"

interface ContainerEnv {
  id: string
  name: string
  image: string
  status: string
}

export default function ContainerEnvironmentManager() {
  const router = useRouter()
  const [containers, setContainers] = useState<ContainerEnv[]>([])

  const refreshContainers = async () => {
    const result = await getRunningContainers()
    setContainers(result)
  }

  const launchContainer = async () => {
    await launchAgentBaseContainer()
    await refreshContainers()
    router.refresh()
  }

  const handleStop = async (name: string) => {
    await stopContainer(name)
    await refreshContainers()
    router.refresh()
  }

  useEffect(() => {
    refreshContainers()
  }, [])

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Running Containers</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" onClick={refreshContainers}>
            Refresh
          </Button>
          <Button size="sm" onClick={launchContainer}>
            Launch new container
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {containers.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.image}</TableCell>
                <TableCell>{c.status}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleStop(c.name)}
                  >
                    Stop
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {containers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-sm text-muted-foreground"
                >
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
