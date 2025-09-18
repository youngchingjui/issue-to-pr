"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Filter, GitPullRequest, Bot, GitMerge, Menu } from "lucide-react"
import { PRCard } from "@/components/pr-card"
import { MobilePRSheet } from "@/components/mobile-pr-sheet"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

// Mock data for PRs
const mockPRs = [
  {
    id: 1,
    title: "Add user authentication system",
    description: "Implement JWT-based authentication with login/logout functionality",
    author: "john-doe",
    avatar: "/developer-working.png",
    status: "open",
    priority: "high",
    branch: "feature/auth-system",
    targetBranch: "main",
    createdAt: "2 hours ago",
    comments: 5,
    reviews: 2,
    checks: { passed: 8, failed: 1, pending: 0 },
    aiSuggestions: ["Fix merge conflicts", "Update branch", "Fix review comments"],
    labels: ["feature", "backend"],
  },
  {
    id: 2,
    title: "Update dashboard UI components",
    description: "Modernize the dashboard with new design system components",
    author: "jane-smith",
    avatar: "/diverse-designers-brainstorming.png",
    status: "draft",
    priority: "medium",
    branch: "ui/dashboard-update",
    targetBranch: "main",
    createdAt: "1 day ago",
    comments: 3,
    reviews: 1,
    checks: { passed: 12, failed: 0, pending: 2 },
    aiSuggestions: ["Split large PR", "Add tests"],
    labels: ["ui", "frontend"],
  },
  {
    id: 3,
    title: "Fix database connection pooling",
    description: "Resolve connection timeout issues in production environment",
    author: "mike-wilson",
    avatar: "/diverse-engineers-meeting.png",
    status: "ready",
    priority: "critical",
    branch: "fix/db-pooling",
    targetBranch: "main",
    createdAt: "3 days ago",
    comments: 8,
    reviews: 3,
    checks: { passed: 15, failed: 0, pending: 0 },
    aiSuggestions: ["Ready to merge"],
    labels: ["bugfix", "database", "critical"],
  },
]

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

export default function PRDashboard() {
  const [selectedPRs, setSelectedPRs] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleSelectPR = (prId: number) => {
    setSelectedPRs((prev) => (prev.includes(prId) ? prev.filter((id) => id !== prId) : [...prev, prId]))
  }

  const handleSelectAll = () => {
    setSelectedPRs(selectedPRs.length === mockPRs.length ? [] : mockPRs.map((pr) => pr.id))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-6 w-6 text-primary transition-transform duration-200 hover:scale-110" />
              <h1 className="text-xl font-semibold">PR Dashboard</h1>
            </div>
            <Badge
              variant="secondary"
              className="hidden sm:inline-flex animate-in fade-in-0 slide-in-from-left-2 duration-300 delay-200"
            >
              {mockPRs.length} Pull Requests
            </Badge>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            <div className="relative animate-in fade-in-0 slide-in-from-right-2 duration-300">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200" />
              <Input
                placeholder="Search pull requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9 transition-all duration-200 focus:w-72"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="animate-in fade-in-0 slide-in-from-right-2 duration-300 delay-100 transition-all duration-200 hover:scale-105 bg-transparent"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button
              size="sm"
              className="animate-in fade-in-0 slide-in-from-right-2 duration-300 delay-200 transition-all duration-200 hover:scale-105 hover:shadow-lg"
            >
              New PR
            </Button>
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-2">
            <Button variant="outline" size="sm" className="transition-all duration-200 hover:scale-105 bg-transparent">
              New PR
            </Button>
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="transition-all duration-200 hover:scale-105">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 animate-in slide-in-from-right duration-300">
                {/* ... existing mobile menu content ... */}
                <div className="space-y-4 mt-6">
                  <div className="relative animate-in fade-in-0 slide-in-from-top-2 duration-300">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search pull requests..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full justify-start animate-in fade-in-0 slide-in-from-top-2 duration-300 delay-100 transition-all duration-200 hover:scale-[1.02] bg-transparent"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filter Options
                  </Button>
                  <div className="pt-4 border-t animate-in fade-in-0 slide-in-from-top-2 duration-300 delay-200">
                    <h3 className="font-medium mb-2">Quick Stats</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between transition-all duration-200 hover:text-primary">
                        <span>Open PRs</span>
                        <span className="font-medium">{mockPRs.filter((pr) => pr.status === "open").length}</span>
                      </div>
                      <div className="flex justify-between transition-all duration-200 hover:text-primary">
                        <span>Ready to merge</span>
                        <span className="font-medium">{mockPRs.filter((pr) => pr.status === "ready").length}</span>
                      </div>
                      <div className="flex justify-between transition-all duration-200 hover:text-primary">
                        <span>Draft PRs</span>
                        <span className="font-medium">{mockPRs.filter((pr) => pr.status === "draft").length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="container px-4 py-6">
        {/* Mobile Search Bar */}
        <div className="md:hidden mb-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search pull requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Batch Actions Bar */}
        {selectedPRs.length > 0 && (
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border bg-card p-4 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedPRs.length === mockPRs.length}
                onCheckedChange={handleSelectAll}
                className="transition-all duration-200 hover:scale-110"
              />
              <span className="text-sm font-medium">{selectedPRs.length} selected</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none transition-all duration-200 hover:scale-105 bg-transparent"
                  >
                    <Bot className="h-4 w-4 mr-2 animate-pulse" />
                    AI Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="animate-in slide-in-from-top-2 duration-200">
                  <DropdownMenuItem className="transition-colors duration-150 hover:bg-primary/10">
                    Fix merge conflicts
                  </DropdownMenuItem>
                  <DropdownMenuItem className="transition-colors duration-150 hover:bg-primary/10">
                    Update branches
                  </DropdownMenuItem>
                  <DropdownMenuItem className="transition-colors duration-150 hover:bg-primary/10">
                    Generate summaries
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none transition-all duration-200 hover:scale-105 bg-transparent"
              >
                <GitMerge className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Merge Selected</span>
                <span className="sm:hidden">Merge</span>
              </Button>
            </div>
          </div>
        )}

        {/* PR List - Desktop */}
        <div className="hidden md:block space-y-4">
          {mockPRs.map((pr, index) => (
            <div
              key={pr.id}
              className={`animate-in fade-in-0 slide-in-from-bottom-2 duration-300`}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <PRCard pr={pr} isSelected={selectedPRs.includes(pr.id)} onSelect={handleSelectPR} />
            </div>
          ))}
        </div>

        {/* PR List - Mobile Cards */}
        <div className="md:hidden space-y-3">
          {mockPRs.map((pr, index) => (
            <div
              key={pr.id}
              className={`animate-in fade-in-0 slide-in-from-bottom-2 duration-300`}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <MobilePRSheet pr={pr}>
                <div className="w-full">
                  <div
                    className={`p-4 rounded-lg border bg-card transition-all duration-200 active:scale-[0.98] hover:shadow-md ${selectedPRs.includes(pr.id) ? "ring-2 ring-primary shadow-lg" : ""}`}
                  >
                    {/* ... existing mobile card content ... */}
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedPRs.includes(pr.id)}
                        onCheckedChange={() => handleSelectPR(pr.id)}
                        className="mt-1 transition-all duration-200 hover:scale-110"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-sm leading-tight text-balance pr-2 transition-colors duration-200 hover:text-primary">
                            {pr.title}
                          </h3>
                          <div className="flex gap-1 shrink-0">
                            <Badge
                              className={`text-xs transition-all duration-200 hover:scale-105 ${statusColors[pr.status as keyof typeof statusColors]}`}
                            >
                              {pr.status}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2 text-pretty">{pr.description}</p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="transition-all duration-200 hover:text-foreground">{pr.author}</span>
                            <span className="transition-all duration-200 hover:text-foreground">{pr.createdAt}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {pr.labels.slice(0, 2).map((label, labelIndex) => (
                              <Badge
                                key={label}
                                variant="outline"
                                className={`text-xs transition-all duration-200 hover:scale-105 animate-in fade-in-0 slide-in-from-right-2`}
                                style={{ animationDelay: `${(labelIndex + 1) * 100}ms` }}
                              >
                                {label}
                              </Badge>
                            ))}
                            {pr.labels.length > 2 && (
                              <Badge variant="outline" className="text-xs transition-all duration-200 hover:scale-105">
                                +{pr.labels.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </MobilePRSheet>
            </div>
          ))}
        </div>

        {/* Mobile Floating Action Button */}
        <div className="md:hidden fixed bottom-6 right-6 z-40 animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-1000">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="lg"
                className="rounded-full h-14 w-14 shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl active:scale-95"
              >
                <Bot className="h-6 w-6 animate-pulse" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 animate-in slide-in-from-bottom-2 duration-200">
              <DropdownMenuItem className="transition-colors duration-150 hover:bg-primary/10">
                <Bot className="h-4 w-4 mr-2" />
                AI Batch Actions
              </DropdownMenuItem>
              <DropdownMenuItem className="transition-colors duration-150 hover:bg-primary/10">
                <GitMerge className="h-4 w-4 mr-2" />
                Merge Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
