"use client"

import { Loader2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { setRepositorySettings as saveRepoSettings } from "@/lib/neo4j/services/repository"
import { Environment, RepoSettings, repoSettingsSchema } from "@/lib/types"
import { RepoSettingsUpdateRequestSchema } from "@/lib/types/api/schemas"
import { RepoFullName } from "@/lib/types/github"

interface RepoSettingsFormProps {
  initialSettings: RepoSettings
  repoFullName: RepoFullName
}

export default function RepoSettingsForm({
  initialSettings,
  repoFullName,
}: RepoSettingsFormProps) {
  const [settings, setSettings] = useState<RepoSettings>(initialSettings)
  const [loading, setLoading] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  async function handleSave() {
    setLoading(true)
    setErrMsg(null)
    setSuccessMsg(null)
    try {
      const validated = repoSettingsSchema.parse({
        ...RepoSettingsUpdateRequestSchema.parse({
          environment: settings.environment,
          setupCommands: settings.setupCommands,
        }),
        lastUpdated: new Date(),
      })

      await saveRepoSettings(repoFullName, validated)

      setSettings(validated)
      setSuccessMsg("Settings saved!")
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrMsg(err.message)
      } else {
        setErrMsg("An unknown error occurred")
      }
    } finally {
      setLoading(false)
    }
  }

  function handleChange<K extends keyof RepoSettings>(
    key: K,
    value: RepoSettings[K]
  ) {
    setSettings((s) => ({ ...s, [key]: value }))
    setSuccessMsg(null)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        handleSave()
      }}
    >
      <div className="mb-4">
        <label className="block mb-2 font-medium">
          Environment (typescript or python)
        </label>
        <Input
          value={settings.environment || ""}
          onChange={(e) =>
            handleChange("environment", e.target.value as Environment)
          }
          placeholder="typescript or python"
          disabled={loading}
        />
      </div>
      <div className="mb-4">
        <label className="block mb-2 font-medium">
          Setup Commands (one per line)
        </label>
        <Textarea
          value={settings.setupCommands || ""}
          onChange={(e) => handleChange("setupCommands", e.target.value)}
          rows={4}
          disabled={loading}
        />
      </div>
      {errMsg && <div className="mb-2 text-red-600">{errMsg}</div>}
      {successMsg && <div className="mb-2 text-green-700">{successMsg}</div>}
      <Button type="submit" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
          </>
        ) : (
          "Save Settings"
        )}
      </Button>
    </form>
  )
}
