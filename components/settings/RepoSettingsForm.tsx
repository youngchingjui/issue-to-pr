"use client"

import { Loader2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
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
      <div className="mb-4 space-y-2">
        <p className="font-medium">Issue Automation</p>
        <div className="flex items-center justify-between">
          <Label
            htmlFor="auto-run-comment"
            className="text-sm text-muted-foreground"
          >
            Auto-run commentOnIssue
          </Label>
          <Switch
            id="auto-run-comment"
            checked={settings.autoRunCommentOnIssue ?? false}
            onCheckedChange={(val) =>
              handleChange("autoRunCommentOnIssue", val)
            }
            disabled
          />
        </div>
        <div className="flex items-center justify-between">
          <Label
            htmlFor="post-issue-comment"
            className="text-sm text-muted-foreground"
          >
            Post comment to GitHub
          </Label>
          <Switch
            id="post-issue-comment"
            checked={settings.autoPostIssueCommentToGitHub ?? false}
            onCheckedChange={(val) =>
              handleChange("autoPostIssueCommentToGitHub", val)
            }
            disabled
          />
        </div>
        <div className="flex items-center justify-between">
          <Label
            htmlFor="auto-run-auto-resolve"
            className="text-sm text-muted-foreground"
          >
            Auto-run autoResolveIssue (on new issues)
          </Label>
          <Switch
            id="auto-run-auto-resolve"
            checked={settings.autoRunAutoResolveIssue ?? false}
            onCheckedChange={(val) =>
              handleChange("autoRunAutoResolveIssue", val)
            }
            disabled={loading}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label
            htmlFor="auto-run-resolve"
            className="text-sm text-muted-foreground"
          >
            Auto-run resolveIssue
          </Label>
          <Switch
            id="auto-run-resolve"
            checked={settings.autoRunResolveIssue ?? false}
            onCheckedChange={(val) => handleChange("autoRunResolveIssue", val)}
            disabled
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="post-pr" className="text-sm text-muted-foreground">
            Create PR on GitHub
          </Label>
          <Switch
            id="post-pr"
            checked={settings.autoPostPrToGitHub ?? false}
            onCheckedChange={(val) => handleChange("autoPostPrToGitHub", val)}
            disabled
          />
        </div>
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
