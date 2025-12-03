"use client"

import { Filter, Search } from "lucide-react"
import { useState } from "react"

import { ContainerCard } from "@/components/playground/ContainerCard"
import { LogPanel } from "@/components/playground/LogPanel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Mock container data
const mockContainers = [
  {
    id: "container-1",
    name: "web-app-prod",
    project: "E-commerce Platform",
    branch: "main",
    status: "running" as const,
    uptime: "7d 12h",
    image: "node:18-alpine",
    ports: "3000:3000",
    hasInstall: true,
    hasBuild: true,
    hasDev: false,
  },
  {
    id: "container-2",
    name: "web-app-staging",
    project: "E-commerce Platform",
    branch: "develop",
    status: "running" as const,
    uptime: "3d 8h",
    image: "node:18-alpine",
    ports: "3001:3000",
    hasInstall: true,
    hasBuild: true,
    hasDev: true,
  },
  {
    id: "container-3",
    name: "api-feature-auth",
    project: "Backend API",
    branch: "feature/oauth-integration",
    status: "running" as const,
    uptime: "18h 24m",
    image: "node:20-alpine",
    ports: "8080:8080",
    hasInstall: true,
    hasBuild: true,
    hasDev: true,
  },
  {
    id: "container-4",
    name: "api-main",
    project: "Backend API",
    branch: "main",
    status: "stopped" as const,
    uptime: "-",
    image: "node:20-alpine",
    ports: "8081:8080",
    hasInstall: true,
    hasBuild: true,
    hasDev: false,
  },
  {
    id: "container-5",
    name: "dashboard-v2",
    project: "Admin Dashboard",
    branch: "v2-redesign",
    status: "running" as const,
    uptime: "1d 4h",
    image: "node:18-alpine",
    ports: "4000:3000",
    hasInstall: true,
    hasBuild: true,
    hasDev: true,
  },
  {
    id: "container-6",
    name: "mobile-api",
    project: "Mobile Backend",
    branch: "main",
    status: "exited" as const,
    uptime: "-",
    image: "node:18-alpine",
    ports: "5000:5000",
    hasInstall: true,
    hasBuild: true,
    hasDev: false,
  },
]

const generateMockLogs = (command: string) => {
  if (command === "install") {
    return `[container] Running: pnpm install
[container] Lockfile is up to date, resolution step is skipped
[container] Packages: +847
[container] ++++++++++++++++++++++++++++++++++++++++++++++++
[container] Progress: resolved 847, reused 847, downloaded 0, added 847, done
[container] 
[container] dependencies:
[container] + next 14.0.4
[container] + react 18.2.0
[container] + react-dom 18.2.0
[container] 
[container] Done in 12.4s`
  } else if (command === "build") {
    return `[container] Running: pnpm build
[container] > next-app@0.1.0 build
[container] > next build
[container] 
[container] ▲ Next.js 14.0.4
[container] - Environments: .env
[container] 
[container] Creating an optimized production build...
[container] ✓ Compiled successfully
[container] ✓ Linting and checking validity of types
[container] ✓ Collecting page data
[container] ✓ Generating static pages (8/8)
[container] ✓ Collecting build traces
[container] ✓ Finalizing page optimization
[container] 
[container] Route (app)                              Size     First Load JS
[container] ┌ ○ /                                    142 B          87.2 kB
[container] └ ○ /_not-found                          871 B          85.1 kB
[container] 
[container] ○  (Static)  prerendered as static content
[container] 
[container] Done in 28.7s`
  } else if (command === "dev") {
    return `[container] Running: pnpm dev
[container] > next-app@0.1.0 dev
[container] > next dev
[container] 
[container] ▲ Next.js 14.0.4
[container] - Local:        http://localhost:3000
[container] - Environments: .env
[container] 
[container] ✓ Ready in 3.2s
[container] ○ Compiling / ...
[container] ✓ Compiled / in 1.8s
[container] GET / 200 in 2145ms
[container] 
[container] Server is running and watching for changes...`
  } else if (command === "inspect") {
    return `[container] Container Details:
[container] 
[container] ID: sha256:a8f3d2c4e1b9f7...
[container] Created: 2024-01-15T10:23:45.123Z
[container] Path: /usr/local/bin/docker-entrypoint.sh
[container] Args: ["node", "server.js"]
[container] State: Running
[container]   Status: running
[container]   Running: true
[container]   Paused: false
[container]   Restarting: false
[container]   OOMKilled: false
[container]   Dead: false
[container]   Pid: 12345
[container]   ExitCode: 0
[container]   Started: 2024-01-15T10:23:47.456Z
[container] 
[container] Image: node:18-alpine
[container] Mounts: []
[container] Config:
[container]   Hostname: web-app-prod
[container]   Env:
[container]     NODE_ENV=production
[container]     PORT=3000`
  }
  return `[container] Command executed successfully`
}

export function ContainerList() {
  const [logData, setLogData] = useState<{
    containerId: string
    command: string
    logs: string
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const handleRunCommand = (
    containerId: string,
    containerName: string,
    command: string
  ) => {
    const mockLogs = generateMockLogs(command)
    setLogData({
      containerId,
      command: `${command} (${containerName})`,
      logs: mockLogs,
    })
  }

  const filteredContainers = mockContainers.filter(
    (container) =>
      container.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      container.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
      container.branch.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Containers</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your Docker containers across different projects and branches
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search containers..."
              className="pl-9 w-64 bg-secondary border-border"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredContainers.map((container) => (
          <ContainerCard
            key={container.id}
            {...container}
            onRunCommand={handleRunCommand}
          />
        ))}
      </div>

      {filteredContainers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No containers found matching your search
        </div>
      )}

      <LogPanel
        isOpen={!!logData}
        onClose={() => setLogData(null)}
        command={logData?.command || ""}
        logs={logData?.logs || ""}
      />
    </div>
  )
}
