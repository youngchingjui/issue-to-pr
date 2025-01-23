"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const ApiKeyInput = () => {
  const [apiKey, setApiKey] = useState("")
  const [maskedKey, setMaskedKey] = useState("")
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    const storedKey = localStorage.getItem("openaiApiKey")
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

  const handleSave = () => {
    localStorage.setItem("openAIApiKey", apiKey)
    setIsEditing(false)
  }

  const maskApiKey = (key: string) => {
    if (key.length <= 10) return key
    return `${key.slice(0, 5)}**********${key.slice(-5)}`
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Input
        type="text"
        id="openai-api-key"
        placeholder={isEditing ? "Enter your OpenAI API key" : ""}
        value={isEditing ? apiKey : maskedKey}
        onChange={handleInputChange}
        readOnly={!isEditing}
        className={!isEditing ? "bg-gray-100 text-gray-500" : ""}
      />
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
