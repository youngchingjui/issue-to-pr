"use client"

import { useState, useTransition } from "react"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { setUserLLMProvider } from "@/lib/neo4j/services/user"
import { LLMProvider, llmProviderEnum } from "@/shared/lib/types"

interface Props {
  initialProvider?: LLMProvider | null
}

function isValidProvider(v: string): v is LLMProvider {
  return llmProviderEnum.safeParse(v).success
}

export default function ModelProviderSelect({ initialProvider }: Props) {
  const [provider, setProvider] = useState<LLMProvider | "">(
    initialProvider ?? ""
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-[1fr] grid-rows-[auto_auto] items-start gap-y-2">
      <Label
        htmlFor="model-provider"
        className="text-xs text-muted-foreground font-light col-start-1 row-start-1"
      >
        Model Provider
      </Label>
      {error && <p className="text-xs text-red-600 col-start-1">{error}</p>}
      <Select
        value={provider || ""}
        onValueChange={(v) => {
          if (!isValidProvider(v)) return
          setProvider(v)
          setError(null)
          startTransition(async () => {
            try {
              await setUserLLMProvider(v)
            } catch {
              setError("Failed to save preference. Please try again.")
              setProvider(initialProvider ?? "")
            }
          })
        }}
        disabled={isPending}
      >
        <SelectTrigger id="model-provider" className="w-full">
          <SelectValue placeholder="Select provider" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="openai">OpenAI</SelectItem>
          <SelectItem value="anthropic">Anthropic Claude</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
