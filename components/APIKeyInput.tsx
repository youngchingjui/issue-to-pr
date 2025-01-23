"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const ApiKeyInput = () => {
  const [apiKey, setApiKey] = useState("")
  const [maskedKey, setMaskedKey] = useState("")

  useEffect(() => {
    const storedKey = localStorage.getItem("openaiApiKey")
    if (storedKey) {
      setApiKey(storedKey)
      setMaskedKey(maskApiKey(storedKey))
    }
  }, [])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = event.target.value
    setApiKey(newKey)
    setMaskedKey(maskApiKey(newKey))
  }

  const handleSave = () => {
    localStorage.setItem("openaiApiKey", apiKey)
  }

  const maskApiKey = (key: string) => {
    if (key.length <= 10) return key
    return `${key.slice(0, 5)}**********${key.slice(-5)}`
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Input
        type="text"
        value={apiKey}
        onChange={handleChange}
        placeholder="Enter API Key"
      />
      <Button onClick={handleSave}>Save</Button>
      <div className="ml-2">{maskedKey}</div>
    </div>
  )
}

export default ApiKeyInput
