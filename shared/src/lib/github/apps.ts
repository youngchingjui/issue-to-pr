"use server"

import { getAppOctokit } from "@/lib/github"

/**
 * Lists all installations of our GitHub App across all accounts/orgs using App authentication.
 * This does NOT depend on the current user's OAuth token.
 */
export async function listAppInstallations() {
  const app = await getAppOctokit()

  const all: unknown[] = []
  let page = 1
  const per_page = 100

  // Manually paginate to avoid relying on octokit.paginate availability on App.octokit
  // Keep fetching until a page returns fewer than `per_page` items
  // See: https://docs.github.com/en/rest/apps/apps?apiVersion=2022-11-28#list-installations-for-the-authenticated-app
  // Note: Requires the app's private key and app id to be configured
  // via GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY_PATH
  // Also ensure the environment running this has access to the private key file
  // referenced by GITHUB_APP_PRIVATE_KEY_PATH.
  // If not configured, this function will throw.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await app.octokit.request("GET /app/installations", {
      per_page,
      page,
    })
    all.push(...data)
    if (!Array.isArray(data) || data.length < per_page) break
    page += 1
  }

  return all
}

