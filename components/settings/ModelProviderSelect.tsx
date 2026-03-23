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

interface Props {
  initialProvider?: "openai" | "anthropic" | null
}

export default function ModelProviderSelect({ initialProvider }: Props) {
  const [provider, setProvider] = useState<"openai" | "anthropic" | "">(
    initialProvider ?? "openai"
  )
  const [isPending, startTransition] = useTransition()

  return (
    <div className="grid grid-cols-[1fr] grid-rows-[auto_auto] items-start gap-y-2">
      <Label
        htmlFor="model-provider"
        className="text-xs text-muted-foreground font-light col-start-1 row-start-1"
      >
        Model Provider
      </Label>
      <Select
        value={provider || "openai"}
        onValueChange={(v) => {
          const val = v as "openai" | "anthropic"
          setProvider(val)
          startTransition(() => {
            void setUserLLMProvider(val)
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

