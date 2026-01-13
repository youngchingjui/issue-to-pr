import { ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"

export interface CreatedPullRequestCardProps {
  number: number
  title: string
  body?: string | null
  url: string
}

export default function CreatedPullRequestCard({
  number,
  title,
  body,
  url,
}: CreatedPullRequestCardProps) {
  return (
    <Card className="border-blue-200 dark:border-blue-900">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                Pull Request
              </span>
              <span className="text-xs text-muted-foreground">#{number}</span>
            </div>
            <CardTitle className="">{title}</CardTitle>
          </div>
          <Button asChild size="sm">
            <a href={url} target="_blank" rel="noopener noreferrer">
              View PR
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardHeader>
    </Card>
  )
}
