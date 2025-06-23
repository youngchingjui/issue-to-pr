"use server"

import RepoSettingsForm from "@/components/settings/RepoSettingsForm"
import { getRepositorySettings } from "@/lib/neo4j/services/repository"
import { repoSettingsSchema } from "@/lib/types"
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

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Repository Settings</h1>
      <RepoSettingsForm
        initialSettings={settings}
        repoFullName={repoFullName}
      />
    </div>
  )
}
