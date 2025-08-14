"use client"

import { Loader2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/lib/hooks/use-toast"
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
  const [isVerifying, setIsVerifying] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    // Keep local state in sync with prop changes
    setApiKey(initialKey)
    setMaskedKey(initialKey ? maskApiKey(initialKey) : "")
    setIsEditing(!initialKey)
  }, [initialKey])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = event.target.value
    setApiKey(newKey)
    setMaskedKey(maskApiKey(newKey))
  }

  const handleSave = async () => {
    try {
      setIsVerifying(true)
      const response = await fetch("/api/openai/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey }),
      })

      if (!response.ok) {
        toast({
          title: "API key verification failed",
          description: "Please check your API key and try again.",
          variant: "destructive",
        })
        return
      }

      const result = await response.json()

      if (result.success) {
        toast({
          title: "API key saved",
          description:
            "Your API key was verified and saved successfully. You can now generate Github comments and create Pull Requests.",
        })
        await setUserOpenAIApiKey(apiKey)
      }
    } catch (error) {
      console.error("Failed to verify API key:", error)
    } finally {
      setIsVerifying(false)
      setIsEditing(false)
    }
  }

  const isSaveDisabled = useMemo(() => {
    // Disable save when verifying or when there's no input yet
    return isVerifying || apiKey.trim().length === 0
  }, [apiKey, isVerifying])

  return (
    <div className="flex items-end justify-end gap-2">
      <div>
        <Label
          htmlFor="openai-api-key"
          className="text-xs text-muted-foreground font-light"
        >
          OpenAI API Key
        </Label>
        <Input
          type="text"
          id="openai-api-key"
          placeholder={isEditing ? "Enter your OpenAI API key" : ""}
          value={isEditing ? apiKey : maskedKey}
          onChange={handleInputChange}
          readOnly={!isEditing}
          className={!isEditing ? "bg-gray-100 text-gray-500" : ""}
        />
      </div>
      {isEditing ? (
        <Button onClick={handleSave} disabled={isSaveDisabled}>
          {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
        </Button>
      ) : (
        <Button onClick={() => setIsEditing(!isEditing)} variant="secondary">
          Edit
        </Button>
      )}
    </div>
  )
}

export default ApiKeyInput

