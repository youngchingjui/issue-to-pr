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
  const [initialKeyLoaded, setInitialKeyLoaded] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    const storedKey = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (storedKey) {
      setApiKey(storedKey)
      setMaskedKey(maskApiKey(storedKey))
    } else {
      setApiKey("")
      setMaskedKey("")
    }
    setInitialKeyLoaded(true)
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
        setMaskedKey(maskApiKey(apiKey))
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

  // Show loading state until we check for key in localStorage (to avoid flickering)
  if (!initialKeyLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[48px]">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // 1. If no key and not editing: show big "Add OpenAI API key" button.
  if (!apiKey && !isEditing) {
    return (
      <Button
        type="button"
        className="bg-black text-white py-3 px-6 text-lg w-full justify-center"
        onClick={() => setIsEditing(true)}
        data-testid="add-api-key-btn"
      >
        Add OpenAI API key
      </Button>
    )
  }

  // 2. Editing: show input and adjacent Save/Cancel logic
  if (isEditing) {
    return (
      <div className="flex items-end gap-2 w-full">
        <div className="w-full">
          <Label
            htmlFor="openai-api-key"
            className="text-xs text-muted-foreground font-light"
          >
            OpenAI API Key
          </Label>
          <Input
            type="text"
            id="openai-api-key"
            placeholder="Enter your OpenAI API key"
            value={apiKey || ""}
            onChange={handleInputChange}
            readOnly={false}
            autoFocus
          />
        </div>
        {apiKey.length === 0 ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              // Cancel, revert even if there was a key before
              // If they were editing to add, just exit editing; if replacing, leave field blank
              // So reload from localStorage (flows: add/cancel, edit/clear/cancel)
              const storedKey = localStorage.getItem(LOCAL_STORAGE_KEY)
              if (storedKey) {
                setApiKey(storedKey)
                setMaskedKey(maskApiKey(storedKey))
              } else {
                setApiKey("")
                setMaskedKey("")
              }
              setIsEditing(false)
            }}
            disabled={isVerifying}
            data-testid="cancel-api-key-btn"
          >
            Cancel
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSave}
            disabled={isVerifying}
            data-testid="save-api-key-btn"
          >
            {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
          </Button>
        )}
      </div>
    )
  }

  // 3. Saved state: masked key + Edit button as before
  return (
    <div className="flex items-end gap-2 w-full">
      <div className="w-full">
        <Label
          htmlFor="openai-api-key"
          className="text-xs text-muted-foreground font-light"
        >
          OpenAI API Key
        </Label>
        <Input
          type="text"
          id="openai-api-key"
          placeholder={""}
          value={maskedKey}
          readOnly
          className="bg-gray-100 text-gray-500"
        />
      </div>
      <Button
        type="button"
        onClick={() => setIsEditing(true)}
        variant="secondary"
        data-testid="edit-api-key-btn"
      >
        Edit
      </Button>
    </div>
  )
}

export default ApiKeyInput
