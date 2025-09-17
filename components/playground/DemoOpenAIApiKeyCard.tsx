"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, CheckCircle2, Loader2, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  deleteDemoOpenAIApiKey,
  setDemoOpenAIApiKey,
} from "@/lib/neo4j/services/appSettings"
import { maskApiKey } from "@/lib/utils/client"

interface Props {
  initialKey?: string
}

export default function DemoOpenAIApiKeyCard({ initialKey = "" }: Props) {
  const [apiKey, setApiKey] = useState(initialKey)
  const [maskedKey, setMaskedKey] = useState(
    initialKey ? maskApiKey(initialKey) : ""
  )
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

  const verifyKey = useCallback(async (keyToVerify: string) => {
    try {
      setVerificationState("verifying")
      const response = await fetch("/api/openai/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: keyToVerify }),
      })
      if (!response.ok) {
        setVerificationState("error")
        setValidationMessage(
          "We couldn\'t verify this API key, please double check your key or create a new one."
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
          "We couldn\'t verify this API key, please double check your key or create a new one."
        )
      }
    } catch (e) {
      console.error("Failed to verify API key:", e)
      setVerificationState("error")
      setValidationMessage("Network issue. Please try again later.")
    }
  }, [])

  useEffect(() => {
    setApiKey(initialKey)
    setMaskedKey(initialKey ? maskApiKey(initialKey) : "")
    setIsEditing(!initialKey)
    setLastSavedKey(initialKey)
    setVerificationState("idle")
    setValidationMessage(null)
    if (initialKey && initialKey.trim().length > 0) {
      setVerificationState("verifying")
      void verifyKey(initialKey)
    }
  }, [initialKey, verifyKey])

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

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await setDemoOpenAIApiKey(apiKey)
      setLastSavedKey(apiKey)
      setIsEditing(false)
      if (apiKey.trim().length > 0) {
        setVerificationState("verifying")
        setValidationMessage(null)
        void verifyKey(apiKey)
      } else {
        setVerificationState("idle")
        setValidationMessage(null)
      }
    } catch (error) {
      console.error("Failed to save API key:", error)
      setIsEditing(false)
      setVerificationState("error")
      setValidationMessage(
        "We couldn\'t verify this API key due to a network issue. It has been saved, but features may not work until it\'s valid."
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsSaving(true)
      await deleteDemoOpenAIApiKey()
      setApiKey("")
      setMaskedKey("")
      setLastSavedKey("")
      setIsEditing(true)
      setVerificationState("idle")
      setValidationMessage(null)
    } catch (error) {
      console.error("Failed to delete API key:", error)
      setValidationMessage("Failed to delete the key. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const isSaveDisabled = useMemo(() => {
    return isSaving || apiKey === lastSavedKey
  }, [isSaving, apiKey, lastSavedKey])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Demo OpenAI API Key (Global)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-1">
                Set a shared/demo OpenAI API key stored in Neo4j. This key is
                used as a fallback for users with the &quot;demo&quot; role.
              </p>
              <div className="grid grid-cols-[1fr_max-content] grid-rows-[auto_auto_auto] items-start gap-x-3 gap-y-0">
                <Label
                  htmlFor="openai-demo-api-key"
                  className="text-xs text-muted-foreground font-light col-start-1 row-start-1"
                >
                  Demo OpenAI API Key
                </Label>

                <div className="relative col-start-1 row-start-2">
                  <Input
                    type={isEditing ? "text" : "password"}
                    id="openai-demo-api-key"
                    placeholder={isEditing ? "sk-..." : ""}
                    value={isEditing ? apiKey : maskedKey}
                    onChange={handleInputChange}
                    onPaste={handlePaste}
                    readOnly={!isEditing}
                    className={`${!isEditing ? "bg-gray-100 text-gray-500" : ""} ${verificationState !== "idle" ? "pr-9" : ""}`}
                  />
                  {verificationState !== "idle" ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="absolute inset-y-0 right-2 flex items-center" aria-live="polite">
                            {verificationState === "verifying" ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Verifying" />
                            ) : verificationState === "verified" ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="Verified" />
                            ) : verificationState === "error" ? (
                              <AlertTriangle className="h-4 w-4 text-red-600" aria-label="Verification error" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-amber-600" aria-label="Couldn\'t verify" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {verificationState === "verifying"
                            ? "Verifying API key…"
                            : verificationState === "verified"
                              ? "Verified"
                              : (validationMessage ?? (verificationState === "error" ? "Verification error" : "Couldn\'t verify"))}
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
                      {lastSavedKey ? (
                        <Button type="button" variant="secondary" onClick={() => {
                          setApiKey(lastSavedKey)
                          setMaskedKey(lastSavedKey ? maskApiKey(lastSavedKey) : "")
                          setIsEditing(false)
                          setValidationMessage(null)
                          setVerificationState("idle")
                        }}>Cancel</Button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button onClick={() => setIsEditing(!isEditing)} variant="secondary">Edit</Button>
                      {lastSavedKey ? (
                        <Button onClick={handleDelete} variant="destructive">
                          <Trash2 className="w-4 h-4 mr-1" /> Remove
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

