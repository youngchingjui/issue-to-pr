"use client"

import { ChevronDown, Slash } from "lucide-react"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function Nav() {
  const params = useParams() as { username: string; repo: string | null }
  const pathname = usePathname()

  const { username, repo } = params
  const currentPage =
    repo && (pathname.split("/").pop() as "issues" | "pullRequests" | null)

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {repo ? (
            <BreadcrumbLink href={`/${username}`}>{username}</BreadcrumbLink>
          ) : (
            <BreadcrumbPage>
              <BreadcrumbLink href={`/${username}`}>{username}</BreadcrumbLink>
            </BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {repo && (
          <>
            <BreadcrumbSeparator>
              <Slash />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/${username}/${repo}/issues`}>
                {repo}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Slash />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <DropdownMenu>
                <BreadcrumbPage>
                  <DropdownMenuTrigger className="flex items-center gap-1">
                    {currentPage === "issues" ? "issues" : "pull requests"}
                    <ChevronDown />
                  </DropdownMenuTrigger>
                </BreadcrumbPage>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem>
                    <Link href={`/${username}/${repo}/issues`}>issues</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href={`/${username}/${repo}/pullRequests`}>
                      pull requests
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
