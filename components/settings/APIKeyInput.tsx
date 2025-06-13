"use client"

import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/lib/hooks/use-toast"

const ApiKeyInput = () => {
  const [apiKey, setApiKey] = useState("")
  const [maskedKey, setMaskedKey] = useState("")
  const [hasKey, setHasKey] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    fetch("/api/user/api-key")
      .then(async (res) => {
        const data = await res.json()
        if (data.hasKey) {
          setHasKey(true)
          setMaskedKey(data.masked)
        } else {
          setHasKey(false)
          setMaskedKey("")
        }
      })
      .catch(() => {
        setHasKey(false)
        setMaskedKey("")
      })
  }, [])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = event.target.value
    setApiKey(newKey)
  }

  const handleSave = async () => {
    try {
      setIsVerifying(true)
      // First, verify with OpenAI
      const checkResponse = await fetch("/api/openai/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey }),
      })
      if (!checkResponse.ok) {
        toast({
          title: "API key verification failed",
          description: "Please check your API key and try again.",
          variant: "destructive",
        })
        return
      }
      const checkResult = await checkResponse.json()
      if (!checkResult.success) {
        toast({
          title: "API key rejected",
          description: "Verification service did not accept the key.",
          variant: "destructive",
        })
        return
      }
      // Store securely on server
      const storeResponse = await fetch("/api/user/api-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey }),
      })
      if (!storeResponse.ok) {
        toast({
          title: "Failed to save API key",
          description: "Error saving key. Please try again.",
          variant: "destructive",
        })
        return
      }
      toast({
        title: "API key saved",
        description:
          "Your API key was verified and saved securely. You can now generate Github comments and create Pull Requests.",
      })
      setApiKey("")
      // Refresh display
      fetch("/api/user/api-key").then(async (res) => {
        const data = await res.json()
        setHasKey(!!data.hasKey)
        setMaskedKey(data.masked)
      })
      setIsEditing(false)
    } catch (error) {
      toast({
        title: "Failed to verify and save API key",
        description: "Try again later.",
        variant: "destructive",
      })
    } finally {
      setIsVerifying(false)
    }
  }

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
          autoComplete="off"
        />
      </div>
      {isEditing ? (
        <Button onClick={handleSave} disabled={isVerifying || !apiKey}>
          {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
        </Button>
      ) : (
        <Button onClick={() => setIsEditing(true)} variant="secondary">
          {hasKey ? "Edit" : "Add"}
        </Button>
      )}
    </div>
  )
}

export default ApiKeyInput
