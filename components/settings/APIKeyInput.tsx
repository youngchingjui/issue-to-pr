"use client"

import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { setUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import { maskApiKey } from "@/lib/utils/client"

interface Props {
  initialKey?: string
}

const ApiKeyInput = ({ initialKey = "" }: Props) => {
  const [apiKey, setApiKey] = useState(initialKey)
  const [maskedKey, setMaskedKey] = useState(
    initialKey ? maskApiKey(initialKey) : ""
  )
  // If there's no initial key, start in editing mode so the user can type immediately
  const [isEditing, setIsEditing] = useState(!initialKey)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedKey, setLastSavedKey] = useState(initialKey)
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null
  )

  type VerificationState =
    | "idle"
    | "verifying"
    | "verified"
    | "unverified"
    | "error"
  const [verificationState, setVerificationState] =
    useState<VerificationState>("idle")

  useEffect(() => {
    // Keep local state in sync with prop changes
    setApiKey(initialKey)
    setMaskedKey(initialKey ? maskApiKey(initialKey) : "")
    setIsEditing(!initialKey)
    setLastSavedKey(initialKey)
    setVerificationState("idle")
    setValidationMessage(null)
  }, [initialKey])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = event.target.value
    setApiKey(newKey)
    setMaskedKey(maskApiKey(newKey))
    if (validationMessage) setValidationMessage(null)
    if (verificationState !== "idle") setVerificationState("idle")
  }

  const handlePaste: React.ClipboardEventHandler<HTMLInputElement> = (e) => {
    const pasted = e.clipboardData.getData("text")
    if (!pasted) return
    e.preventDefault()
    const cleaned = pasted.trim()
    setApiKey(cleaned)
    setMaskedKey(maskApiKey(cleaned))
    setValidationMessage(null)
    setVerificationState("idle")
  }

  const verifyKey = async (keyToVerify: string) => {
    try {
      setVerificationState("verifying")
      const response = await fetch("/api/openai/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey: keyToVerify }),
      })

      if (!response.ok) {
        setVerificationState("error")
        setValidationMessage(
          "We couldn't verify this API key, please double check your key or create a new one."
        )
        return
      }

      const result = await response.json()
      if (result?.success) {
        setVerificationState("verified")
        setValidationMessage(null)
      } else {
        setVerificationState("unverified")
        setValidationMessage(
          "We couldn't verify this API key, please double check your key or create a new one."
        )
      }
    } catch (error) {
      console.error("Failed to verify API key:", error)
      setVerificationState("error")
      setValidationMessage("Network issue. Please try again later.")
    } finally {
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      // A) Save to database (non-blocking UX returns after this)
      await setUserOpenAIApiKey(apiKey)
      setLastSavedKey(apiKey)
      setIsEditing(false)
      // Show an inline "Saved" state and then verify in the background
      setVerificationState("verifying")
      setValidationMessage(null)
      // B) Verify key in the background; don't block the button return
      void verifyKey(apiKey)
    } catch (error) {
      console.error("Failed to verify API key:", error)
      // Try to still save so user doesn't lose edits
      try {
        await setUserOpenAIApiKey(apiKey)
        setLastSavedKey(apiKey)
      } catch (saveErr) {
        console.error("Failed to save API key:", saveErr)
      }
      setIsEditing(false)
      setVerificationState("error")
      setValidationMessage(
        "We couldn't verify this API key due to a network issue. It has been saved, but features may not work until it's valid."
      )
    } finally {
      setIsSaving(false)
    }
  }

  const isSaveDisabled = useMemo(() => {
    // Disable save when verifying or when there's no input yet
    return isSaving || apiKey.trim().length === 0
  }, [apiKey, isSaving])

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!isEditing) return
    if (e.key === "Enter" && !isSaveDisabled) {
      e.preventDefault()
      void handleSave()
    } else if (e.key === "Escape") {
      e.preventDefault()
      // Revert edits
      setApiKey(lastSavedKey)
      setMaskedKey(lastSavedKey ? maskApiKey(lastSavedKey) : "")
      setIsEditing(false)
      setValidationMessage(null)
      setVerificationState("idle")
    }
  }

  return (
    <div className="grid grid-cols-[1fr_max-content] grid-rows-[auto_auto_auto] items-start gap-x-3 gap-y-0">
      <Label
        htmlFor="openai-api-key"
        className="text-xs text-muted-foreground font-light col-start-1 row-start-1"
      >
        OpenAI API Key
      </Label>

      <div className="relative col-start-1 row-start-2">
        <Input
          type={isEditing ? "text" : "password"}
          id="openai-api-key"
          placeholder={isEditing ? "Enter your OpenAI API key" : ""}
          value={isEditing ? apiKey : maskedKey}
          onChange={handleInputChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          readOnly={!isEditing}
          className={`${!isEditing ? "bg-gray-100 text-gray-500" : ""} ${
            verificationState !== "idle" ? "pr-9" : ""
          }`}
        />
        {verificationState !== "idle" ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="absolute inset-y-0 right-2 flex items-center"
                  aria-live="polite"
                >
                  {verificationState === "verifying" ? (
                    <Loader2
                      className="h-4 w-4 animate-spin text-muted-foreground"
                      aria-label="Verifying"
                    />
                  ) : verificationState === "verified" ? (
                    <CheckCircle2
                      className="h-4 w-4 text-green-600"
                      aria-label="Verified"
                    />
                  ) : verificationState === "error" ? (
                    <AlertTriangle
                      className="h-4 w-4 text-red-600"
                      aria-label="Verification error"
                    />
                  ) : (
                    <AlertTriangle
                      className="h-4 w-4 text-amber-600"
                      aria-label="Couldn't verify"
                    />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                {verificationState === "verifying"
                  ? "Verifying API key…"
                  : verificationState === "verified"
                    ? "Verified"
                    : (validationMessage ??
                      (verificationState === "error"
                        ? "Verification error"
                        : "Couldn't verify"))}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>

      <div className="col-start-2 row-start-2">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={isSaveDisabled}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setApiKey(lastSavedKey)
                setMaskedKey(lastSavedKey ? maskApiKey(lastSavedKey) : "")
                setIsEditing(false)
                setValidationMessage(null)
                setVerificationState("idle")
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex">
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant="secondary"
              className=""
            >
              Edit
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ApiKeyInput
