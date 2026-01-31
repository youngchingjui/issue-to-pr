"use server"

import { n4j } from "@/lib/neo4j/client"
import { neo4jToJs } from "@/lib/neo4j/convert"
import * as repoRepo from "@/lib/neo4j/repositories/repository"
import {
  BuildDeploymentSettings as AppBuildDeploymentSettings,
  buildDeploymentSettingsSchema,
  RepoSettings as AppRepoSettings,
  repoSettingsSchema,
} from "@/lib/types"
import { RepoFullName } from "@/lib/types/github"

export async function getRepositorySettings(
  repoFullName: RepoFullName
): Promise<AppRepoSettings | null> {
  const session = await n4j.getSession()
  try {
    const db = await session.executeRead((tx) =>
      repoRepo.getRepositorySettings(tx, repoFullName.fullName)
    )
    if (!db) return null
    return repoSettingsSchema.parse(neo4jToJs(db))
  } finally {
    await session.close()
  }
}

export async function setRepositorySettings(
  repoFullName: RepoFullName,
  settings: AppRepoSettings
): Promise<void> {
  const session = await n4j.getSession()
  try {
    await session.executeWrite((tx) => {
      const { lastUpdated: _ignored, ...rest } = settings
      repoRepo.setRepositorySettings(tx, repoFullName.fullName, rest)
    })
  } finally {
    await session.close()
  }
}

// ---- Build & Deployment services ----
export async function getBuildDeploymentSettings(
  repoFullName: RepoFullName
): Promise<AppBuildDeploymentSettings | null> {
  const session = await n4j.getSession()
  try {
    const db = await session.executeRead((tx) =>
      repoRepo.getBuildDeploymentSettings(tx, repoFullName.fullName)
    )
    if (!db) return null
    return buildDeploymentSettingsSchema.parse(neo4jToJs(db))
  } finally {
    await session.close()
  }
}

export async function setBuildDeploymentSettings(
  repoFullName: RepoFullName,
  settings: AppBuildDeploymentSettings
): Promise<void> {
  const session = await n4j.getSession()
  try {
    await session.executeWrite((tx) => {
      const { lastUpdated: _ignored, ...rest } = settings
      repoRepo.setBuildDeploymentSettings(tx, repoFullName.fullName, rest)
    })
  } finally {
    await session.close()
  }
}
