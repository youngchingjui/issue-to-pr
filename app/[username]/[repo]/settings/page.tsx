import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Environment, RepoSettings, repoSettingsSchema } from "@/lib/types"

function repoFullNameFromParams(params: { username: string; repo: string }) {
  return `${params.username}/${params.repo}`
}

export default function RepoSettingsPage() {
  const params = useParams() as { username: string; repo: string }

  const repoFullName = repoFullNameFromParams(params)
  const [settings, setSettings] = useState<RepoSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Fetch settings
  useEffect(() => {
    setLoading(true)
    fetch(`/api/repository/${encodeURIComponent(repoFullName)}/settings`)
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok)
          throw new Error(json.error || "Failed to load repo settings")
        setSettings(repoSettingsSchema.parse(json))
      })
      .catch((err) => setErrMsg(err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line
  }, [repoFullName])

  // Save handler
  async function handleSave() {
    setLoading(true)
    setErrMsg(null)
    setSuccessMsg(null)
    try {
      const res = await fetch(
        `/api/repository/${encodeURIComponent(repoFullName)}/settings`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(settings?.environment
              ? { environment: settings.environment }
              : {}),
            setupCommands: settings?.setupCommands || [],
          }),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save settings")
      setSettings(repoSettingsSchema.parse(json))
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
    setSettings((s) => (s ? { ...s, [key]: value } : s))
    setSuccessMsg(null)
  }

  if (loading && !settings) return <div>Loading...</div>
  if (errMsg && !settings)
    return <div className="text-red-600">Error: {errMsg}</div>
  if (!settings) return null

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Repository Settings</h1>
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
            value={settings.setupCommands.join("\n")}
            onChange={(e) =>
              handleChange(
                "setupCommands",
                e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            rows={4}
            disabled={loading}
          />
        </div>
        {errMsg && <div className="mb-2 text-red-600">{errMsg}</div>}
        {successMsg && <div className="mb-2 text-green-700">{successMsg}</div>}
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Settings"}
        </Button>
      </form>
    </div>
  )
}
