"use server"

import { createAppAuth } from "@octokit/auth-app"
import { Octokit } from "@octokit/rest"

import { getPrivateKeyFromFile } from "../github"

const privateKey = await getPrivateKeyFromFile()

if (!process.env.GITHUB_APP_ID) {
  throw new Error("GITHUB_APP_ID is not set")
}

const octokit = new Octokit({
  authStrategy: createAppAuth,
  auth: {
    appId: process.env.GITHUB_APP_ID,
    privateKey,
  },
})

export const getAppInstallations = async () => {
  const { data: installations } = await octokit.request(
    "GET /app/installations"
  )

  // Return the installations so callers (e.g. playground card) can render them
  return installations
}

export const listReposForInstallation = async () => {
  const { data: repos } = await octokit.request(
    `GET /installation/repositories`,
    {
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  )

  return repos
}
