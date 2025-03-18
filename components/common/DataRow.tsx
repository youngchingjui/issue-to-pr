"use client"

import { formatDistanceToNow } from "date-fns"
import { ChevronDown, ExternalLink, Loader2, PlayCircle } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TableCell, TableRow } from "@/components/ui/table"

interface DataRowProps {
  title: string
  number: number
  url: string
  githubUrl: string
  user: string
  state: string
  updatedAt: string
  children: React.ReactNode // For dropdown menu items
  isLoading?: boolean
  activeWorkflow?: string | null
}

export default function DataRow({
  title,
  number,
  url,
  githubUrl,
  user,
  state,
  updatedAt,
  children,
  isLoading = false,
  activeWorkflow = null,
}: DataRowProps) {
  return (
    <TableRow>
      <TableCell className="py-4">
        <div className="flex flex-col gap-1">
          <div className="font-medium text-base flex items-center gap-2">
            <Link href={url} className="hover:underline">
              {title}
            </Link>
            <Link
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span>#{number}</span>
            <span>•</span>
            <span>{user}</span>
            <span>•</span>
            <span>{state}</span>
            <span>•</span>
            <span>
              Updated{" "}
              {formatDistanceToNow(new Date(updatedAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {activeWorkflow}
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Launch Workflow
                  <ChevronDown className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            {children}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
