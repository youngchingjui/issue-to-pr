"use client"

import {
  Clock,
  Eye,
  GitBranch,
  ImageIcon,
  MoreVertical,
  Network,
  Play,
  Square,
  Terminal,
  Trash2,
} from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ContainerCardProps {
  id: string
  name: string
  project: string
  branch: string
  status: "running" | "stopped" | "exited"
  uptime: string
  image: string
  ports: string
  hasInstall: boolean
  hasBuild: boolean
  hasDev: boolean
  onRunCommand: (id: string, name: string, command: string) => void
}

export function ContainerCard({
  id,
  name,
  project,
  branch,
  status,
  uptime,
  image,
  ports,
  hasInstall,
  hasBuild,
  hasDev,
  onRunCommand,
}: ContainerCardProps) {
  const [currentStatus, setCurrentStatus] = useState(status)

  const getStatusColor = () => {
    switch (currentStatus) {
      case "running":
        return "bg-accent/10 text-accent border-accent/20"
      case "stopped":
        return "bg-muted/50 text-muted-foreground border-border"
      case "exited":
        return "bg-destructive/10 text-destructive border-destructive/20"
      default:
        return "bg-muted/50 text-muted-foreground border-border"
    }
  }

  const handleStart = () => {
    setCurrentStatus("running")
    onRunCommand(id, name, "start")
  }

  const handleStop = () => {
    setCurrentStatus("stopped")
    onRunCommand(id, name, "stop")
  }

  const handleDelete = () => {
    // Mock delete action
    console.log("Deleting container:", id)
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-base font-semibold text-foreground font-mono">
              {name}
            </h3>
            <Badge className={getStatusColor()}>
              {currentStatus === "running" && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent mr-1.5 animate-pulse" />
              )}
              {currentStatus}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground mb-1 text-xs">Project</div>
              <div className="text-foreground font-medium">{project}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1 text-xs flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                Branch
              </div>
              <div className="text-foreground font-mono text-xs px-2 py-1 rounded inline-block">
                {branch}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1 text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Uptime
              </div>
              <div className="text-foreground">{uptime}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1 text-xs flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                Image
              </div>
              <div className="text-foreground font-mono text-xs">{image}</div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Network className="h-3 w-3" />
            <span>Ports: {ports}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentStatus === "running" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStop}
              className="gap-2 bg-transparent"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStart}
              className="gap-2 bg-transparent"
            >
              <Play className="h-3.5 w-3.5" />
              Start
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-transparent"
              >
                <Terminal className="h-3.5 w-3.5" />
                Run Command
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {hasInstall && (
                <DropdownMenuItem
                  onClick={() => onRunCommand(id, name, "install")}
                >
                  <Terminal className="mr-2 h-4 w-4" />
                  Install Dependencies
                </DropdownMenuItem>
              )}
              {hasBuild && (
                <DropdownMenuItem
                  onClick={() => onRunCommand(id, name, "build")}
                >
                  <Terminal className="mr-2 h-4 w-4" />
                  Build Project
                </DropdownMenuItem>
              )}
              {hasDev && (
                <DropdownMenuItem onClick={() => onRunCommand(id, name, "dev")}>
                  <Terminal className="mr-2 h-4 w-4" />
                  Start Development
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => onRunCommand(id, name, "inspect")}
              >
                <Eye className="mr-2 h-4 w-4" />
                Inspect
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
