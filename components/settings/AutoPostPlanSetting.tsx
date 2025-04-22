"use client"

import { useEffect, useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useToast } from "@/lib/hooks/use-toast"

interface ApiResult {
  enabled: boolean
  error?: string
}

// For demo/testing: hardcoded installation ID.
// In a production install, supply this from user session/app context.
const DEMO_INSTALL_ID = 1

const AutoPostPlanSetting = () => {
  const [enabled, setEnabled] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchSetting() {
      setLoading(true)
      try {
        const res = await fetch("/api/settings/auto-post-plan", {
          headers: { "x-installation-id": String(DEMO_INSTALL_ID) }
        })
        if (!res.ok) throw new Error("Could not fetch setting")
        const json: ApiResult = await res.json()
        if (typeof json.enabled === "boolean") {
          setEnabled(json.enabled)
        }
      } catch (err) {
        toast({
          title: "Error loading setting",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    fetchSetting()
  }, [toast])

  async function handleChange(checked: boolean) {
    setSaving(true)
    try {
      const res = await fetch("/api/settings/auto-post-plan", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-installation-id": String(DEMO_INSTALL_ID)
        },
        body: JSON.stringify({ enabled: checked })
      })
      const json: ApiResult = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error || "Could not update setting")
      }
      setEnabled(json.enabled)
      toast({ title: "Preference updated", description: "Changed setting for plan auto-posting." })
    } catch (err) {
      toast({
        title: "Error updating setting",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 py-4">
      <Label className="font-semibold">Automatically post Plan as GitHub comment when a new issue is created?</Label>
      <div className="flex items-center gap-3">
        <Checkbox
          id="auto-post-plan-checkbox"
          checked={enabled}
          disabled={loading || saving}
          onCheckedChange={val => typeof val === "boolean" && handleChange(val)}
        />
        <Label htmlFor="auto-post-plan-checkbox" className="text-muted-foreground text-sm">
          {loading ? (
            <span className="flex items-center gap-1"><Loader2 className="animate-spin h-4 w-4" />Loading…</span>
          ) : saving ? (
            <span className="flex items-center gap-1"><Loader2 className="animate-spin h-4 w-4" />Saving…</span>
          ) : enabled ? (
            "Enabled (will auto-comment on new issues)" 
          ) : (
            "Disabled (no automatic plan comment)"
          )}
        </Label>
      </div>
      <div className="text-xs text-muted-foreground max-w-md">
        This preference automatically generates and posts a Plan as a comment when a new GitHub issue is opened in any repository under this installation. <br />
        You can enable or disable it here at any time.
      </div>
    </div>
  )
}

export default AutoPostPlanSetting;
