"use client"

import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LOCAL_STORAGE_KEY } from "@/lib/globals"
import { useToast } from "@/lib/hooks/use-toast"
import { setUserOpenAIApiKey } from "@/lib/neo4j/services/user"

const ApiKeyInput = () => {
  const [apiKey, setApiKey] = useState("")
  const [maskedKey, setMaskedKey] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    const storedKey = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (storedKey) {
      setApiKey(storedKey)
      setMaskedKey(maskApiKey(storedKey))
    }
  }, [])

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
        localStorage.removeItem(LOCAL_STORAGE_KEY)
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
        localStorage.setItem(LOCAL_STORAGE_KEY, apiKey)
      }
    } catch (error) {
      console.error("Failed to verify API key:", error)
      localStorage.removeItem(LOCAL_STORAGE_KEY)
    } finally {
      setIsVerifying(false)
      setIsEditing(false)
    }
  }

  const maskApiKey = (key: string) => {
    if (key.length <= 10) return key
    return `${key.slice(0, 5)}**********${key.slice(-4)}`
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
        />
      </div>
      {isEditing ? (
        <Button onClick={handleSave} disabled={isVerifying}>
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
