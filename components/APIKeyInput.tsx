"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const LOCAL_STORAGE_KEY = "openAIApiKey"

const ApiKeyInput = () => {
  const [apiKey, setApiKey] = useState("")
  const [maskedKey, setMaskedKey] = useState("")
  const [isEditing, setIsEditing] = useState(false)

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
      const response = await fetch("/api/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey }),
      })

      const result = await response.json()

      if (result.success) {
        localStorage.setItem(LOCAL_STORAGE_KEY, apiKey)
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY)
      }
    } catch (error) {
      console.error("Failed to verify API key:", error)
      localStorage.removeItem(LOCAL_STORAGE_KEY)
    } finally {
      setIsEditing(false)
    }
  }

  const maskApiKey = (key: string) => {
    if (key.length <= 10) return key
    return `${key.slice(0, 5)}**********${key.slice(-5)}`
  }

  return (
    <div className="flex items-end justify-end gap-2">
      <div>
        <Label
          htmlFor="openai-api-key"
          className="text-xs text-muted-foreground"
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
        <Button onClick={handleSave}>Save</Button>
      ) : (
        <Button onClick={() => setIsEditing(!isEditing)} variant="secondary">
          Edit
        </Button>
      )}
    </div>
  )
}

export default ApiKeyInput
