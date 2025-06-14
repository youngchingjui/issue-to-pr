"use server"

import RepoSettingsForm from "@/components/settings/RepoSettingsForm"
import { repoSettingsSchema } from "@/lib/types"

interface Params {
  username: string
  repo: string
}

function repoFullNameFromParams(params: Params) {
  return `${params.username}/${params.repo}`
}

export default async function RepoSettingsPage({ params }: { params: Params }) {
  const repoFullName = repoFullNameFromParams(params)

  const res = await fetch(
    `/api/repository/${params.username}/${params.repo}/settings`,
    { cache: "no-store" }
  )

  if (!res.ok) {
    // Let the nearest error boundary handle this
    throw new Error("Failed to load repository settings")
  }

  const json = await res.json()
  const settings = repoSettingsSchema.parse(json)

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
