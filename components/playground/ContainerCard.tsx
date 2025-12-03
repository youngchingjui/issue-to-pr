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
} from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ContainerCardProps {
  id: string
  name: string
  project?: string
  branch?: string
  status: "running" | "stopped" | "exited" | string
  uptime?: string
  image: string
  ports?: string
  onRunCommand?: (id: string, name: string, command: string) => void
  onStop?: (id: string, name: string) => Promise<void> | void
  onStart?: (id: string, name: string) => Promise<void> | void
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
  onRunCommand,
  onStop,
  onStart,
}: ContainerCardProps) {
  const initialStatus =
    status === "running" || status === "stopped" || status === "exited"
      ? (status as "running" | "stopped" | "exited")
      : status?.toLowerCase().includes("run")
        ? "running"
        : "stopped"

  const [currentStatus, setCurrentStatus] = useState<
    "running" | "stopped" | "exited"
  >(initialStatus)

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

  const handleStart = async () => {
    setCurrentStatus("running")
    if (onRunCommand) onRunCommand(id, name, "start")
    if (onStart) await onStart(id, name)
  }

  const handleStop = async () => {
    setCurrentStatus("stopped")
    if (onRunCommand) onRunCommand(id, name, "stop")
    if (onStop) await onStop(id, name)
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
            {project && (
              <div>
                <div className="text-muted-foreground mb-1 text-xs">
                  Project
                </div>
                <div className="text-foreground font-medium">{project}</div>
              </div>
            )}
            {branch && (
              <div>
                <div className="text-muted-foreground mb-1 text-xs flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  Branch
                </div>
                <div className="text-foreground font-mono text-xs px-2 py-1 rounded inline-block">
                  {branch}
                </div>
              </div>
            )}
            <div>
              <div className="text-muted-foreground mb-1 text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Uptime
              </div>
              <div className="text-foreground">{uptime ?? "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1 text-xs flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                Image
              </div>
              <div className="text-foreground font-mono text-xs">{image}</div>
            </div>
          </div>

          {ports && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Network className="h-3 w-3" />
              <span>Ports: {ports}</span>
            </div>
          )}
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
              <DropdownMenuItem
                onClick={() => onRunCommand?.(id, name, "install")}
              >
                <Terminal className="mr-2 h-4 w-4" />
                Install Dependencies
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onRunCommand?.(id, name, "build")}
              >
                <Terminal className="mr-2 h-4 w-4" />
                Build Project
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => onRunCommand?.(id, name, "dev")}>
                <Terminal className="mr-2 h-4 w-4" />
                Start Development
              </DropdownMenuItem>
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
                onClick={() => onRunCommand?.(id, name, "inspect")}
              >
                <Eye className="mr-2 h-4 w-4" />
                Inspect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
