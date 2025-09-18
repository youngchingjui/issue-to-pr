"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Bot,
  MoreHorizontal,
  MessageSquare,
  Eye,
  GitBranch,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

interface PRCardProps {
  pr: {
    id: number
    title: string
    description: string
    author: string
    avatar: string
    status: string
    priority: string
    branch: string
    targetBranch: string
    createdAt: string
    comments: number
    reviews: number
    checks: { passed: number; failed: number; pending: number }
    aiSuggestions: string[]
    labels: string[]
  }
  isSelected: boolean
  onSelect: (id: number) => void
}

const statusColors = {
  open: "bg-green-100 text-green-800 border-green-200",
  draft: "bg-gray-100 text-gray-800 border-gray-200",
  ready: "bg-blue-100 text-blue-800 border-blue-200",
  merged: "bg-purple-100 text-purple-800 border-purple-200",
  closed: "bg-red-100 text-red-800 border-red-200",
}

const priorityColors = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
}

export function PRCard({ pr, isSelected, onSelect }: PRCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Card
      className={`transition-all duration-300 ease-out cursor-pointer transform ${
        isSelected
          ? "ring-2 ring-primary shadow-lg scale-[1.02]"
          : isHovered
            ? "shadow-md scale-[1.01]"
            : "hover:shadow-md hover:scale-[1.01]"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelect(pr.id)}
              className="mt-1 transition-all duration-200 hover:scale-110"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h3 className="font-semibold text-base leading-tight text-balance transition-colors duration-200 hover:text-primary">
                  {pr.title}
                </h3>
                <Badge
                  className={`text-xs transition-all duration-200 hover:scale-105 ${statusColors[pr.status as keyof typeof statusColors]}`}
                >
                  {pr.status}
                </Badge>
                <Badge
                  className={`text-xs transition-all duration-200 hover:scale-105 ${priorityColors[pr.priority as keyof typeof priorityColors]}`}
                >
                  {pr.priority}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mb-3 text-pretty">{pr.description}</p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1 transition-all duration-200 hover:text-foreground">
                  <Avatar className="h-4 w-4 transition-transform duration-200 hover:scale-110">
                    <AvatarImage src={pr.avatar || "/placeholder.svg"} />
                    <AvatarFallback>{pr.author[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span>{pr.author}</span>
                </div>
                <div className="flex items-center gap-1 transition-all duration-200 hover:text-foreground">
                  <GitBranch className="h-3 w-3" />
                  <span className="truncate max-w-32">{pr.branch}</span>
                  <span>→</span>
                  <span>{pr.targetBranch}</span>
                </div>
                <div className="flex items-center gap-1 transition-all duration-200 hover:text-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{pr.createdAt}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 transition-all duration-200 hover:scale-105 hover:shadow-sm bg-transparent"
                >
                  <Bot className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:rotate-12" />
                  AI Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="animate-in slide-in-from-top-2 duration-200">
                {pr.aiSuggestions.map((suggestion, index) => (
                  <DropdownMenuItem
                    key={index}
                    className="cursor-pointer transition-colors duration-150 hover:bg-primary/10"
                  >
                    <Bot className="h-4 w-4 mr-2 text-primary" />
                    {suggestion}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 transition-all duration-200 hover:scale-105 hover:bg-muted"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="animate-in slide-in-from-top-2 duration-200">
                <DropdownMenuItem className="transition-colors duration-150 hover:bg-primary/10">
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem className="transition-colors duration-150 hover:bg-primary/10">
                  Edit PR
                </DropdownMenuItem>
                <DropdownMenuItem className="transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive">
                  Close PR
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm transition-all duration-200 hover:text-primary hover:scale-105">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span>{pr.comments}</span>
            </div>
            <div className="flex items-center gap-1 text-sm transition-all duration-200 hover:text-primary hover:scale-105">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span>{pr.reviews}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1 transition-all duration-200 hover:scale-105">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{pr.checks.passed}</span>
              </div>
              {pr.checks.failed > 0 && (
                <div className="flex items-center gap-1 transition-all duration-200 hover:scale-105">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span>{pr.checks.failed}</span>
                </div>
              )}
              {pr.checks.pending > 0 && (
                <div className="flex items-center gap-1 transition-all duration-200 hover:scale-105">
                  <AlertCircle className="h-4 w-4 text-yellow-600 animate-pulse" />
                  <span>{pr.checks.pending}</span>
                </div>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-105"
          >
            {isExpanded ? (
              <>
                <ChevronUp
                  className={`h-4 w-4 mr-1 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                />
                Less
              </>
            ) : (
              <>
                <ChevronDown
                  className={`h-4 w-4 mr-1 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                />
                More
              </>
            )}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {pr.labels.map((label, index) => (
              <Badge
                key={label}
                variant="outline"
                className={`text-xs transition-all duration-200 hover:scale-105 hover:shadow-sm animate-in fade-in-0 slide-in-from-left-2`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Expanded content with smooth animation */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-out ${
            isExpanded ? "max-h-96 opacity-100 mt-4" : "max-h-0 opacity-0"
          }`}
        >
          <div className="pt-4 border-t space-y-3">
            <div className="animate-in slide-in-from-top-2 duration-300">
              <h4 className="text-sm font-medium mb-2">AI Recommendations</h4>
              <div className="space-y-2">
                {pr.aiSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-2 rounded-md bg-muted/50 transition-all duration-200 hover:bg-muted hover:scale-[1.02] animate-in slide-in-from-left-2`}
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-primary animate-pulse" />
                      <span className="text-sm">{suggestion}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="transition-all duration-200 hover:scale-105 hover:shadow-sm bg-transparent"
                    >
                      Apply
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="animate-in slide-in-from-top-2 duration-300 delay-200">
              <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
              <div className="flex gap-2 flex-wrap">
                {["Review Changes", "Run Tests", "Merge"].map((action, index) => (
                  <Button
                    key={action}
                    size="sm"
                    variant="outline"
                    className={`transition-all duration-200 hover:scale-105 hover:shadow-sm animate-in slide-in-from-bottom-2`}
                    style={{ animationDelay: `${(index + 3) * 100}ms` }}
                  >
                    {action}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
