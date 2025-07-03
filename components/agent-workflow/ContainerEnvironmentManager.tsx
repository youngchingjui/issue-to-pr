"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ContainerEnv {
  id: string
  name: string
  image: string
  mounts: string[]
  workdir: string
  running: boolean
}

export default function ContainerEnvironmentManager() {
  const [containers, setContainers] = useState<ContainerEnv[]>([
    {
      id: "1",
      name: "agent-env-1",
      image: "ubuntu:latest",
      mounts: ["/workspace", "/data"],
      workdir: "/workspace",
      running: true,
    },
    {
      id: "2",
      name: "agent-env-2",
      image: "node:20",
      mounts: ["/app"],
      workdir: "/app",
      running: false,
    },
  ])
  const [activeId, setActiveId] = useState<string>(containers[0].id)

  const toggleContainer = (id: string) => {
    setContainers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, running: !c.running } : c))
    )
  }

  const startNewContainer = () => {
    const newId = Date.now().toString()
    const newContainer: ContainerEnv = {
      id: newId,
      name: `agent-env-${containers.length + 1}`,
      image: "ubuntu:latest",
      mounts: ["/workspace"],
      workdir: "/workspace",
      running: true,
    }
    setContainers((prev) => [...prev, newContainer])
    setActiveId(newId)
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Container Environments</CardTitle>
        <Button size="sm" onClick={startNewContainer}>
          Start New Container
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Active</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Mounts</TableHead>
              <TableHead>Workdir</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {containers.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <input
                    type="radio"
                    name="activeContainer"
                    checked={activeId === c.id}
                    onChange={() => setActiveId(c.id)}
                  />
                </TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.image}</TableCell>
                <TableCell>{c.mounts.join(", ")}</TableCell>
                <TableCell>{c.workdir}</TableCell>
                <TableCell>{c.running ? "Running" : "Stopped"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" onClick={() => toggleContainer(c.id)}>
                    {c.running ? "Shut Down" : "Start"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
