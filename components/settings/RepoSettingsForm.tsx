"use client"

import { Loader2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { setRepositorySettings as saveRepoSettings } from "@/lib/neo4j/services/repository"
import { Environment, environmentEnum, RepoSettings } from "@/lib/types"
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
      await saveRepoSettings(repoFullName, settings)

      setSettings(settings)
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
        <label className="block mb-2 font-medium">Environment</label>
        <Select
          value={settings.environment ?? ""}
          onValueChange={(value) =>
            handleChange("environment", value as Environment)
          }
          disabled={loading}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select environment" />
          </SelectTrigger>
          <SelectContent>
            {environmentEnum.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mb-4">
        <label className="block mb-2 font-medium">Setup Commands</label>
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
