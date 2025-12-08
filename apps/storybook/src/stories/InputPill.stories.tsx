import type { Meta, StoryObj } from "@storybook/nextjs"
import React, { useCallback, useState } from "react"

import InputPill from "@/components/input-pill/input-pill"

interface PillJob {
  id: string
  status: "processing" | "ready"
  label?: string
}

const meta: Meta<typeof InputPill> = {
  title: "App/InputPill",
  component: InputPill,
  parameters: {
    layout: "fullscreen",
  },
}
export default meta

type Story = StoryObj<typeof InputPill>

export const Playground: Story = {
  render: () => {
    const [jobs, setJobs] = useState<PillJob[]>([])

    const onSubmit = useCallback(async (input: string, isVoice: boolean) => {
      // Simulate a background job lifecycle
      const id = Math.random().toString(36).slice(2)
      setJobs((prev) => [
        ...prev,
        {
          id,
          status: "processing",
          label: isVoice ? "Transcribing…" : "Thinking…",
        },
      ])

      // After a short delay, mark as ready with a new label
      setTimeout(() => {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === id
              ? {
                  ...j,
                  status: "ready",
                  label: `Result for: ${input.slice(0, 20)}`,
                }
              : j
          )
        )
      }, 1500)
    }, [])

    const onRevealJob = useCallback((id: string) => {
      // In your app, this could open a diff or navigate to a preview
      // Here we just remove the job from the list to simulate handling it
      setJobs((prev) => prev.filter((j) => j.id !== id))
    }, [])

    const onSeeAllPreviews = useCallback(() => {
      // No-op for Storybook demo
      // eslint-disable-next-line no-console
      console.log("See all previews clicked")
    }, [])

    return (
      <div className="h-[70vh] w-full bg-background">
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            Use the mic to start voice mode or open the menu to choose text
            input. Submitting will create a mock background job shown as a
            floating pill.
          </p>
        </div>
        <InputPill
          jobs={jobs}
          onSubmit={onSubmit}
          onRevealJob={onRevealJob}
          onSeeAllPreviews={onSeeAllPreviews}
        />
      </div>
    )
  },
}

export const WithExistingJobs: Story = {
  render: () => {
    const [jobs, setJobs] = useState<PillJob[]>([
      { id: "1", status: "processing", label: "Generating plan…" },
      { id: "2", status: "ready", label: "Change ready" },
    ])

    const onSubmit = async () => {}

    const onRevealJob = (id: string) =>
      setJobs((prev) => prev.filter((j) => j.id !== id))

    return (
      <div className="h-[70vh] w-full bg-background">
        <InputPill jobs={jobs} onSubmit={onSubmit} onRevealJob={onRevealJob} />
      </div>
    )
  },
}
