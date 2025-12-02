"use client"

import { Loader2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  setBuildDeploymentSettings as saveBuildSettings,
  setRepositorySettings as saveRepoSettings,
} from "@/lib/neo4j/services/repository"
import {
  BuildDeploymentSettings,
  Environment,
  environmentEnum,
  RepoSettings,
} from "@/lib/types"
import { RepoFullName } from "@/lib/types/github"

interface RepoSettingsFormProps {
  initialSettings: RepoSettings
  initialBuildDeployment?: BuildDeploymentSettings | null
  repoFullName: RepoFullName
}

export default function RepoSettingsForm({
  initialSettings,
  initialBuildDeployment,
  repoFullName,
}: RepoSettingsFormProps) {
  const [settings, setSettings] = useState<RepoSettings>(initialSettings)
  const [loading, setLoading] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [buildSettings, setBuildSettings] = useState<BuildDeploymentSettings>(
    initialBuildDeployment ?? {
      installCommand: "",
      buildCommand: "",
      devCommand: "",
    }
  )
  const [buildLoading, setBuildLoading] = useState(false)
  const [buildErrMsg, setBuildErrMsg] = useState<string | null>(null)
  const [buildSuccessMsg, setBuildSuccessMsg] = useState<string | null>(null)

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

  async function handleSaveBuild() {
    setBuildLoading(true)
    setBuildErrMsg(null)
    setBuildSuccessMsg(null)
    try {
      await saveBuildSettings(repoFullName, buildSettings)
      setBuildSuccessMsg(
        (initialBuildDeployment ? "Updated" : "Saved") + " successfully!"
      )
    } catch (err: unknown) {
      if (err instanceof Error) {
        setBuildErrMsg(err.message)
      } else {
        setBuildErrMsg("An unknown error occurred")
      }
    } finally {
      setBuildLoading(false)
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
    <div className="space-y-10">
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
          <p className="font-medium">Issue Automation (UI only)</p>
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
          <p className="text-xs text-muted-foreground">
            Workflow automation settings are coming soon.
          </p>
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

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSaveBuild()
        }}
        className="border-t pt-6"
      >
        <h2 className="text-xl font-semibold mb-4">Build & Deployment</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="buildCmd">Build command</Label>
            <Input
              id="buildCmd"
              type="text"
              value={buildSettings.buildCommand ?? ""}
              onChange={(e) =>
                setBuildSettings((s) => ({ ...s, buildCommand: e.target.value }))
              }
              disabled={buildLoading}
            />
          </div>
          <div>
            <Label htmlFor="installCmd">Install command</Label>
            <Input
              id="installCmd"
              type="text"
              value={buildSettings.installCommand ?? ""}
              onChange={(e) =>
                setBuildSettings((s) => ({
                  ...s,
                  installCommand: e.target.value,
                }))
              }
              disabled={buildLoading}
            />
          </div>
          <div>
            <Label htmlFor="devCmd">Development command</Label>
            <Input
              id="devCmd"
              type="text"
              value={buildSettings.devCommand ?? ""}
              onChange={(e) =>
                setBuildSettings((s) => ({ ...s, devCommand: e.target.value }))
              }
              disabled={buildLoading}
            />
          </div>
        </div>
        {buildErrMsg && <div className="mt-2 text-red-600">{buildErrMsg}</div>}
        {buildSuccessMsg && (
          <div className="mt-2 text-green-700">{buildSuccessMsg}</div>
        )}
        <Button type="submit" disabled={buildLoading} className="mt-4">
          {buildLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : initialBuildDeployment ? (
            "Update"
          ) : (
            "Save"
          )}
        </Button>
      </form>
    </div>
  )
}

