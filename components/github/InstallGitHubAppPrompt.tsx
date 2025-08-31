import Link from "next/link"

const PROD_INSTALL_URL = "https://github.com/apps/issuetopr-dev/installations/new"
const DEV_INSTALL_URL = "https://github.com/apps/dev-issue-to-pr/installations/new"

function getInstallUrl() {
  // Use NODE_ENV to decide which GitHub App to install. In local `next dev` the
  // value is "development", while in production/deployed environments it's
  // "production". We want the dev app for local development so contributors can
  // test the flow without impacting the real production install.
  if (process.env.NODE_ENV === "development") {
    return DEV_INSTALL_URL
  }
  return PROD_INSTALL_URL
}

export default function InstallGitHubAppPrompt() {
  const href = getInstallUrl()
  return (
    <div className="flex flex-col items-center space-y-6 text-center py-16">
      <h2 className="text-3xl font-semibold">No accessible repositories found</h2>
      <p className="max-w-md text-muted-foreground">
        You don’t seem to have granted Issue&nbsp;To&nbsp;PR access to any of
        your repositories yet. To continue, install the GitHub App on the
        repositories you’d like to use.
      </p>
      <Link
        href={href}
        className="inline-block rounded-md bg-black px-6 py-3 text-white hover:bg-gray-800 transition-colors"
      >
        Install GitHub App
      </Link>
    </div>
  )
}

