"use client"

import type React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Bot,
  MessageSquare,
  Eye,
  GitBranch,
  ExternalLink,
} from "lucide-react"

interface MobilePRSheetProps {
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
  children: React.ReactNode
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

export function MobilePRSheet({ pr, children }: MobilePRSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-2 mb-2 animate-in fade-in-0 slide-in-from-top-2 duration-300">
            <SheetTitle className="text-lg text-balance">{pr.title}</SheetTitle>
            <Badge
              className={`text-xs transition-all duration-200 hover:scale-105 ${statusColors[pr.status as keyof typeof statusColors]}`}
            >
              {pr.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mb-4 animate-in fade-in-0 slide-in-from-top-2 duration-300 delay-100">
            <Badge
              className={`text-xs transition-all duration-200 hover:scale-105 ${priorityColors[pr.priority as keyof typeof priorityColors]}`}
            >
              {pr.priority}
            </Badge>
            {pr.labels.map((label, index) => (
              <Badge
                key={label}
                variant="outline"
                className={`text-xs transition-all duration-200 hover:scale-105 animate-in fade-in-0 slide-in-from-left-2`}
                style={{ animationDelay: `${(index + 2) * 100}ms` }}
              >
                {label}
              </Badge>
            ))}
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-200">
            <p className="text-sm text-muted-foreground text-pretty">{pr.description}</p>
          </div>

          <div className="flex items-center gap-4 text-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-300">
            <div className="flex items-center gap-2 transition-all duration-200 hover:scale-105">
              <Avatar className="h-6 w-6">
                <AvatarImage src={pr.avatar || "/placeholder.svg"} />
                <AvatarFallback>{pr.author[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <span>{pr.author}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground transition-all duration-200 hover:text-foreground">
              <Clock className="h-4 w-4" />
              <span>{pr.createdAt}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-400">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-xs bg-muted px-2 py-1 rounded transition-all duration-200 hover:bg-muted/80">
              {pr.branch}
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="font-mono text-xs bg-muted px-2 py-1 rounded transition-all duration-200 hover:bg-muted/80">
              {pr.targetBranch}
            </span>
          </div>

          <Separator className="animate-in fade-in-0 duration-300 delay-500" />

          <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-600">
            <h3 className="font-medium mb-3">Status & Checks</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center transition-all duration-200 hover:scale-105">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{pr.comments}</span>
                </div>
                <span className="text-xs text-muted-foreground">Comments</span>
              </div>
              <div className="text-center transition-all duration-200 hover:scale-105">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{pr.reviews}</span>
                </div>
                <span className="text-xs text-muted-foreground">Reviews</span>
              </div>
              <div className="text-center transition-all duration-200 hover:scale-105">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-600">{pr.checks.passed}</span>
                  </div>
                  {pr.checks.failed > 0 && (
                    <div className="flex items-center gap-1">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-600">{pr.checks.failed}</span>
                    </div>
                  )}
                  {pr.checks.pending > 0 && (
                    <div className="flex items-center gap-1">
                      <AlertCircle className="h-4 w-4 text-yellow-600 animate-pulse" />
                      <span className="font-medium text-yellow-600">{pr.checks.pending}</span>
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">Checks</span>
              </div>
            </div>
          </div>

          <Separator className="animate-in fade-in-0 duration-300 delay-700" />

          <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-800">
            <h3 className="font-medium mb-3">AI Recommendations</h3>
            <div className="space-y-3">
              {pr.aiSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg bg-muted/50 transition-all duration-200 hover:bg-muted hover:scale-[1.02] animate-in slide-in-from-left-2`}
                  style={{ animationDelay: `${(index + 9) * 100}ms` }}
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

          <Separator className="animate-in fade-in-0 duration-300 delay-1000" />

          <div className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-1100">
            <Button className="w-full transition-all duration-200 hover:scale-[1.02] hover:shadow-lg" size="lg">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Full PR
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="lg"
                className="transition-all duration-200 hover:scale-[1.02] hover:shadow-sm bg-transparent"
              >
                Review Changes
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="transition-all duration-200 hover:scale-[1.02] hover:shadow-sm bg-transparent"
              >
                Run Tests
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
