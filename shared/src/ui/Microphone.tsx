"use client"

import React, { useCallback, useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mic,
  Square,
} from "lucide-react"

export type MicrophoneState =
  | "idle"
  | "recording"
  | "transcribing"
  | "success"
  | "error"

export interface MicrophoneProps {
  className?: string
  disabled?: boolean
  // Controlled state (optional). If provided, the component becomes controlled.
  state?: MicrophoneState
  onStateChange?: (state: MicrophoneState) => void
  // Uncontrolled initial state
  initialState?: MicrophoneState

  // Callbacks
  onStartRecording?: () => void | Promise<void>
  onStopRecording?: () => void | Promise<void>
  // Called after stop; resolve to indicate success, reject to show error.
  onTranscribe?: () => Promise<void>

  // Optional labels/messages
  idleLabel?: string
  recordingLabel?: string
  transcribingLabel?: string
  successLabel?: string
  errorLabel?: string
}

export function Microphone({
  className,
  disabled,
  state,
  onStateChange,
  initialState = "idle",
  onStartRecording,
  onStopRecording,
  onTranscribe,
  idleLabel = "Tap to record",
  recordingLabel = "Listening…",
  transcribingLabel = "Transcribing…",
  successLabel = "Transcribed",
  errorLabel = "Something went wrong",
}: MicrophoneProps) {
  const [internalState, setInternalState] = useState<MicrophoneState>(
    initialState
  )
  const [lastError, setLastError] = useState<string | null>(null)

  const effectiveState = state ?? internalState
  const setState = useCallback(
    (s: MicrophoneState) => {
      if (state === undefined) setInternalState(s)
      onStateChange?.(s)
    },
    [state, onStateChange]
  )

  const isBusy = effectiveState === "transcribing"

  const handleStart = useCallback(async () => {
    if (disabled) return
    setLastError(null)
    setState("recording")
    try {
      await onStartRecording?.()
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e))
      setState("error")
    }
  }, [disabled, onStartRecording, setState])

  const runTranscription = useCallback(async () => {
    try {
      await onTranscribe?.()
      setState("success")
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e))
      setState("error")
    }
  }, [onTranscribe, setState])

  const handleStopAndTranscribe = useCallback(async () => {
    if (disabled) return
    try {
      await onStopRecording?.()
    } catch (e) {
      // stopping failed shouldn't block moving forward, but record the error
      setLastError(e instanceof Error ? e.message : String(e))
    }
    setState("transcribing")
    await runTranscription()
  }, [disabled, onStopRecording, runTranscription, setState])

  const reset = useCallback(() => {
    setLastError(null)
    setState("idle")
  }, [setState])

  const label = useMemo(() => {
    switch (effectiveState) {
      case "recording":
        return recordingLabel
      case "transcribing":
        return transcribingLabel
      case "success":
        return successLabel
      case "error":
        return lastError ? `${errorLabel}: ${lastError}` : errorLabel
      default:
        return idleLabel
    }
  }, [
    effectiveState,
    errorLabel,
    idleLabel,
    lastError,
    recordingLabel,
    successLabel,
    transcribingLabel,
  ])

  const icon = useMemo(() => {
    switch (effectiveState) {
      case "recording":
        return <Mic className="h-6 w-6" />
      case "transcribing":
        return <Loader2 className="h-6 w-6 animate-spin" />
      case "success":
        return <CheckCircle2 className="h-6 w-6" />
      case "error":
        return <AlertTriangle className="h-6 w-6" />
      default:
        return <Mic className="h-6 w-6" />
    }
  }, [effectiveState])

  const ringClass = useMemo(() => {
    switch (effectiveState) {
      case "recording":
        return "ring-4 ring-red-500 animate-pulse"
      case "transcribing":
        return "ring-4 ring-blue-500"
      case "success":
        return "ring-4 ring-emerald-500"
      case "error":
        return "ring-4 ring-amber-500"
      default:
        return "ring-2 ring-muted"
    }
  }, [effectiveState])

  const bgClass = useMemo(() => {
    switch (effectiveState) {
      case "recording":
        return "bg-red-600 text-white"
      case "transcribing":
        return "bg-blue-600 text-white"
      case "success":
        return "bg-emerald-600 text-white"
      case "error":
        return "bg-amber-600 text-white"
      default:
        return "bg-background text-foreground"
    }
  }, [effectiveState])

  const handleMainClick = useCallback(() => {
    if (effectiveState === "idle") return void handleStart()
    if (effectiveState === "recording") return void handleStopAndTranscribe()
    if (effectiveState === "success" || effectiveState === "error")
      return reset()
  }, [effectiveState, handleStart, handleStopAndTranscribe, reset])

  return (
    <div className={`inline-flex flex-col items-center ${className || ""}`}>
      <button
        type="button"
        disabled={disabled || isBusy}
        onClick={handleMainClick}
        className={[
          "relative h-16 w-16 select-none rounded-full border",
          "transition-colors duration-200 ease-out",
          ringClass,
          bgClass,
          disabled || isBusy ? "opacity-60 cursor-not-allowed" : "hover:opacity-90",
        ].join(" ")}
        aria-label={label}
      >
        <span className="sr-only">{label}</span>
        <div className="flex h-full w-full items-center justify-center">
          {icon}
        </div>
        {effectiveState === "recording" && (
          <span className="absolute -right-2 -top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white shadow">
            REC
          </span>
        )}
      </button>

      <div className="mt-2 text-sm text-muted-foreground text-center max-w-[220px]">
        {label}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {effectiveState === "recording" && (
          <button
            type="button"
            onClick={handleStopAndTranscribe}
            disabled={disabled}
            className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-muted"
          >
            <Square className="h-3 w-3" /> Stop & Transcribe
          </button>
        )}

        {effectiveState === "error" && (
          <button
            type="button"
            onClick={handleStopAndTranscribe}
            disabled={disabled || isBusy}
            className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-muted"
          >
            Retry
          </button>
        )}

        {(effectiveState === "success" || effectiveState === "error") && (
          <button
            type="button"
            onClick={reset}
            disabled={disabled || isBusy}
            className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-muted"
          >
            Start over
          </button>
        )}
      </div>
    </div>
  )
}

export default Microphone

