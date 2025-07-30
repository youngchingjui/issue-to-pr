import Link from "next/link"

import { Button } from "@/components/ui/button"

interface Props {
  /**
   * Optional GitHub App slug. When omitted, the component falls back to the
   * NEXT_PUBLIC_GITHUB_APP_SLUG environment variable.
   */
  appSlug?: string
}

/**
 * Displays a call-to-action prompting the user to install the Issue&nbsp;to&nbsp;PR
 * GitHub App when no repositories are accessible. If the GitHub App slug is
 * missing, an explicit error message is shown so the developer can configure
 * the environment correctly.
 */
export default function NoRepoCTA({ appSlug }: Props) {
  const slug = appSlug ?? process.env.NEXT_PUBLIC_GITHUB_APP_SLUG

  // Environment mis-configuration guard
  if (!slug) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">Your Issues</h1>
        <div className="text-destructive">
          GitHub App slug is not configured. Please set
          NEXT_PUBLIC_GITHUB_APP_SLUG.
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Welcome</h1>
      <Button asChild>
        <Link
          href={`https://github.com/apps/${slug}/installations/new`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Connect your GitHub repository to get started
        </Link>
      </Button>
    </div>
  )
}
