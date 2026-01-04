import type { Meta, StoryObj } from "@storybook/nextjs"
import React, { useState } from "react"

import { Microphone, type MicrophoneState } from "@/shared/ui/Microphone"

const meta: Meta<typeof Microphone> = {
  title: "Shared/Microphone",
  component: Microphone,
  parameters: {
    layout: "padded",
  },
}

export default meta

type Story = StoryObj<typeof Microphone>

export const Interactive: Story = {
  render: (args) => {
    return (
      <Microphone
        {...args}
        onTranscribe={async () => {
          // Simulate network + random outcome
          await new Promise((r) => setTimeout(r, 1200))
          if (Math.random() < 0.2) {
            throw new Error("Network error")
          }
        }}
      />
    )
  },
}

export const AllStates: Story = {
  render: () => {
    const states: MicrophoneState[] = [
      "idle",
      "recording",
      "transcribing",
      "success",
      "error",
    ]
    return (
      <div className="grid grid-cols-2 gap-8">
        {states.map((s) => (
          <div key={s} className="flex flex-col items-center">
            <Microphone state={s} />
            <div className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
              {s}
            </div>
          </div>
        ))}
      </div>
    )
  },
}

export const Controlled: Story = {
  render: (args) => {
    const [state, setState] = useState<MicrophoneState>("idle")

    return (
      <div className="space-y-4">
        <Microphone {...args} state={state} onStateChange={setState} />
        <div className="flex flex-wrap gap-2">
          {(
            ["idle", "recording", "transcribing", "success", "error"] as const
          ).map((s) => (
            <button
              key={s}
              className={`rounded border px-2 py-1 text-sm ${
                state === s ? "bg-muted" : ""
              }`}
              onClick={() => setState(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    )
  },
}
