"use server"

import RepoSettingsForm from "@/components/settings/RepoSettingsForm"
import {
  getBuildDeploymentSettings,
  getRepositorySettings,
} from "@/lib/neo4j/services/repository"
import { buildDeploymentSettingsSchema, repoSettingsSchema } from "@/lib/types"
import { repoFullNameSchema } from "@/lib/types/github"

interface Params {
  username: string
  repo: string
}

export default async function RepoSettingsPage({ params }: { params: Params }) {
  const repoFullName = repoFullNameSchema.parse(
    `${params.username}/${params.repo}`
  )

  const settings =
    (await getRepositorySettings(repoFullName)) ?? repoSettingsSchema.parse({})

  const buildDeployment =
    (await getBuildDeploymentSettings(repoFullName)) ??
    buildDeploymentSettingsSchema.parse({})

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Repository Settings</h1>
      <RepoSettingsForm
        initialSettings={settings}
        initialBuildDeployment={buildDeployment}
        repoFullName={repoFullName}
      />
    </div>
  )
}

