import Link from "next/link"

import { isAppInstalledForRepo } from "@/lib/github/install-check"

interface LayoutProps {
  children: React.ReactNode
  params: {
    username: string
    repo: string
  }
}

export default async function RepoLayout({ children, params }: LayoutProps) {
  const { username, repo } = params

  // Build GitHub App installation URL if available
  const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG
  const installUrl = appSlug
    ? `https://github.com/apps/${appSlug}/installations/new`
    : undefined

  const installed = await isAppInstalledForRepo({ owner: username, repo })

  if (!installed) {
    return (
      <main className="container mx-auto p-4">
        <div className="mb-6 rounded-md border border-yellow-300 bg-yellow-50 p-4 text-yellow-900">
          <h1 className="text-xl font-semibold mb-2">
            Issue to PR GitHub App is not installed for {username}/{repo}
          </h1>
          <p className="mb-4">
            To use Issue to PR features on this repository, install the GitHub App.
          </p>
          {installUrl ? (
            <Link
              href={installUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md bg-stone-900 px-4 py-2 text-white hover:bg-stone-800"
            >
              Install Issue to PR on GitHub
            </Link>
          ) : (
            <div className="text-red-700">
              The GitHub App slug is not configured. Please set NEXT_PUBLIC_GITHUB_APP_SLUG.
            </div>
          )}
        </div>
      </main>
    )
  }

  return <>{children}</>
}

