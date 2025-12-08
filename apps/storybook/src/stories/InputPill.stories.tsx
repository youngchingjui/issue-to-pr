import type { Meta, StoryObj } from "@storybook/nextjs"
import React, { useCallback, useEffect, useState } from "react"

import InputPill from "@/components/input-pill/input-pill"

interface PillJob {
  id: string
  status: "processing" | "ready"
  label?: string
}

const meta: Meta<typeof InputPill> = {
  title: "App/InputPill",
  component: InputPill,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    mode: {
      control: { type: "radio" },
      options: ["collapsed", "text", "voice"],
    },
    simulateVoice: {
      control: "boolean",
    },
    jobs: {
      control: "object",
    },
  },
}
export default meta

type Story = StoryObj<typeof InputPill>
type ControlsArgs = {
  mode?: "collapsed" | "text" | "voice"
  simulateVoice?: boolean
  voiceIsStarting?: boolean
  voiceIsRecording?: boolean
  voiceIsPaused?: boolean
  voiceHasRecording?: boolean
  voiceTime?: number
  jobs?: PillJob[]
}
type ControlsStory = StoryObj<ControlsArgs>

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
      console.log("See all previews clicked")
    }, [])

    return (
      <InputPill
        jobs={jobs}
        onSubmit={onSubmit}
        onRevealJob={onRevealJob}
        onSeeAllPreviews={onSeeAllPreviews}
      />
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
      <InputPill jobs={jobs} onSubmit={onSubmit} onRevealJob={onRevealJob} />
    )
  },
}

export const ControlsPlayground: ControlsStory = {
  args: {
    mode: "collapsed",
    simulateVoice: true,
    voiceIsStarting: false,
    voiceIsRecording: false,
    voiceIsPaused: false,
    voiceHasRecording: false,
    voiceTime: 0,
    jobs: [],
  },
  render: (raw) => {
    const args = raw as ControlsArgs
    const [curMode, setCurMode] = useState<string>(
      (args.mode ?? "collapsed") as string
    )
    const [voiceState, setVoiceState] = useState({
      isStarting: !!(args.voiceIsStarting ?? false),
      isRecording: !!(args.voiceIsRecording ?? false),
      isPaused: !!(args.voiceIsPaused ?? false),
      hasRecording: !!(args.voiceHasRecording ?? false),
      recordingTime: Number(args.voiceTime ?? 0) || 0,
    })
    const [jobs, setJobs] = useState<PillJob[]>((args.jobs ?? []) as PillJob[])

    useEffect(() => {
      setCurMode((args.mode ?? "collapsed") as string)
    }, [args.mode])
    useEffect(() => {
      setVoiceState({
        isStarting: !!(args.voiceIsStarting ?? false),
        isRecording: !!(args.voiceIsRecording ?? false),
        isPaused: !!(args.voiceIsPaused ?? false),
        hasRecording: !!(args.voiceHasRecording ?? false),
        recordingTime: Number(args.voiceTime ?? 0) || 0,
      })
    }, [
      args.voiceIsStarting,
      args.voiceIsRecording,
      args.voiceIsPaused,
      args.voiceHasRecording,
      args.voiceTime,
    ])
    useEffect(() => {
      setJobs(((args.jobs ?? []) as PillJob[]) ?? [])
    }, [args.jobs])

    const onSubmit = useCallback(async (input: string, isVoice: boolean) => {
      // keep minimal; users can manipulate jobs via Controls
      // eslint-disable-next-line no-console
      console.log("Submit", { input, isVoice })
    }, [])

    return (
      <InputPill
        jobs={jobs}
        onSubmit={onSubmit}
        mode={curMode as "collapsed" | "text" | "voice"}
        onModeChange={(m) => setCurMode(m)}
        simulateVoice={!!args.simulateVoice}
        simulatedVoiceState={{
          isStarting: voiceState.isStarting,
          isRecording: voiceState.isRecording,
          isPaused: voiceState.isPaused,
          hasRecording: voiceState.hasRecording,
          recordingTime: voiceState.recordingTime,
        }}
        onSimulatedVoiceStateChange={(state) => {
          setVoiceState((prev) => ({
            ...prev,
            isStarting: !!state.isStarting,
            isRecording: !!state.isRecording,
            isPaused: !!state.isPaused,
            hasRecording: !!state.hasRecording,
            recordingTime:
              typeof state.recordingTime === "number"
                ? state.recordingTime
                : prev.recordingTime,
          }))
        }}
      />
    )
  },
}

export const VoiceStarting: ControlsStory = {
  args: {
    mode: "voice",
    simulateVoice: true,
    voiceIsStarting: true,
    voiceIsRecording: false,
    voiceIsPaused: false,
    voiceHasRecording: false,
    voiceTime: 0,
    jobs: [],
  },
  render: ControlsPlayground.render,
}

export const VoiceRecording: ControlsStory = {
  args: {
    mode: "voice",
    simulateVoice: true,
    voiceIsStarting: false,
    voiceIsRecording: true,
    voiceIsPaused: false,
    voiceHasRecording: false,
    voiceTime: 12,
    jobs: [],
  },
  render: ControlsPlayground.render,
}

export const VoicePaused: ControlsStory = {
  args: {
    mode: "voice",
    simulateVoice: true,
    voiceIsStarting: false,
    voiceIsRecording: false,
    voiceIsPaused: true,
    voiceHasRecording: false,
    voiceTime: 25,
    jobs: [],
  },
  render: ControlsPlayground.render,
}

export const VoiceReady: ControlsStory = {
  args: {
    mode: "voice",
    simulateVoice: true,
    voiceIsStarting: false,
    voiceIsRecording: false,
    voiceIsPaused: false,
    voiceHasRecording: true,
    voiceTime: 30,
    jobs: [],
  },
  render: ControlsPlayground.render,
}

export const WithProcessingJobs: Story = {
  render: () => {
    const jobs: PillJob[] = [
      { id: "p1", status: "processing", label: "Generating plan…" },
      { id: "p2", status: "processing", label: "Running checks…" },
    ]
    const onSubmit = async () => {}
    return <InputPill jobs={jobs} onSubmit={onSubmit} />
  },
}

export const WithReadyJobs: Story = {
  render: () => {
    const jobs: PillJob[] = [
      { id: "r1", status: "ready", label: "Change ready" },
      { id: "r2", status: "ready", label: "Preview available" },
    ]
    const onSubmit = async () => {}
    return <InputPill jobs={jobs} onSubmit={onSubmit} />
  },
}

export const MixedJobs: Story = {
  render: () => {
    const jobs: PillJob[] = [
      { id: "m1", status: "processing", label: "Drafting changes…" },
      { id: "m2", status: "ready", label: "Result for: refactor inputs" },
    ]
    const onSubmit = async () => {}
    return <InputPill jobs={jobs} onSubmit={onSubmit} />
  },
}
