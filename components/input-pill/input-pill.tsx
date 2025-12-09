"use client"

import { useEffect, useRef, useState } from "react"

import { StatusTicker } from "@/components/input-pill/status-ticker"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import MockVoiceService from "@/lib/adapters/voice/MockVoiceService"
import { useVoice } from "@/lib/hooks/useVoice"
import { VoicePort } from "@/lib/types/voice"

type Mode = "collapsed" | "text" | "voice"

interface PillJob {
  id: string
  status: "processing" | "ready"
  label?: string
}

interface InputPillProps {
  onSubmit: (input: string, isVoice: boolean) => Promise<void>
  jobs?: PillJob[]
  onRevealJob?: (id: string) => void
  onSeeAllPreviews?: () => void
  voicePortFactory?: () => VoicePort
}

export default function InputPill({
  onSubmit,
  jobs = [],
  onRevealJob,
  onSeeAllPreviews,
  voicePortFactory = () => new MockVoiceService(),
}: InputPillProps) {
  const voice = useVoice(voicePortFactory)

  const [textInput, setTextInput] = useState("")
  const [mode, setMode] = useState<Mode>("collapsed")

  const micButtonRef = useRef<HTMLButtonElement | null>(null)

  // Dropdown state
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const splitRef = useRef<HTMLDivElement | null>(null)

  // Close dropdown on outside click or on escape
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!isMenuOpen) return
      if (splitRef.current && !splitRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsMenuOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [isMenuOpen])

  // Collapse on Escape when in text/voice and return focus to mic button when collapsing
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (mode !== "collapsed") {
          if (mode === "voice") {
            voice.discard()
          }
          setMode("collapsed")
        }
        setIsMenuOpen(false)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [mode, voice])

  const prevModeRef = useRef<Mode>(mode)
  useEffect(() => {
    if (prevModeRef.current !== "collapsed" && mode === "collapsed") {
      micButtonRef.current?.focus?.()
    }
    prevModeRef.current = mode
  }, [mode])

  const handleVoiceSubmit = async () => {
    await voice.stop()

    // Optimistic: fire-and-forget, collapse UI immediately
    onSubmit(`Voice recording (${voice.recordingTime}s)`, true).catch((e) =>
      console.error("[v0] Voice submit error:", e)
    )

    // Reset voice UI state
    await voice.discard()
    setMode("collapsed")
  }

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      // Optimistic: fire-and-forget, collapse UI immediately
      onSubmit(textInput, false).catch((e) =>
        console.error("[v0] Text submit error:", e)
      )
      setTextInput("")
      setMode("collapsed")
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Render a stack of status pills (processing and ready)
  const hasJobs = jobs && jobs.length > 0
  const jobsInRenderOrder = [...jobs] // newest last so it appears closest to the split button

  return (
    <div className="pointer-events-auto slide-up">
      {/* Screen reader live region summarizing background jobs */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {jobs?.length
          ? `${jobs.filter((j) => j.status === "processing").length} job(s) in progress, ${jobs.filter((j) => j.status === "ready").length} ready`
          : ""}
      </div>
      {/* Floating status pills */}
      {hasJobs && (
        <div className="mb-2">
          <div className="flex flex-col items-end gap-2">
            {jobsInRenderOrder.map((job) => (
              <div
                key={job.id}
                className={`status-bubble rounded-full border bg-card/95 px-3 py-2 text-sm shadow-lg backdrop-blur-sm flex items-center gap-2`}
              >
                {job.status === "processing" ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-20"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-70"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span className="text-muted-foreground">
                      <StatusTicker
                        message={job.label ?? "Working in background…"}
                      />
                    </span>
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-muted-foreground">
                      {job.label ?? "Change ready"}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => onRevealJob?.(job.id)}
                    >
                      Show
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collapsed State - split button bottom-right */}
      {mode === "collapsed" && (
        <div ref={splitRef} className="relative flex justify-end">
          <div className="inline-flex items-center gap-px rounded-full border bg-card/95 p-1 shadow-lg backdrop-blur-sm">
            <Button
              size="icon-lg"
              variant="ghost"
              className="rounded-l-full hover:bg-accent"
              ref={micButtonRef}
              onClick={() => {
                voice.start()
                setMode("voice")
              }}
              aria-label="Start voice input"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </Button>
            <div className="h-6 w-px bg-border" />
            <Button
              size="icon-lg"
              variant="ghost"
              className={`rounded-r-full hover:bg-accent transition-transform ${isMenuOpen ? "rotate-180" : ""}`}
              onClick={() => setIsMenuOpen((v) => !v)}
              aria-label="More input options"
              aria-expanded={isMenuOpen}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </Button>
          </div>

          {isMenuOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-56 rounded-xl border bg-card/95 p-1.5 shadow-xl backdrop-blur-sm">
              <button
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setIsMenuOpen(false)
                  setMode("text")
                }}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Text input
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setIsMenuOpen(false)
                  if (onSeeAllPreviews) onSeeAllPreviews()
                  else console.log("[v0] See all previews clicked")
                }}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                See all previews
              </button>
            </div>
          )}
        </div>
      )}

      {/* Text Input Mode */}
      {mode === "text" && (
        <div className="ml-auto max-w-md rounded-2xl border bg-card/95 p-4 shadow-xl backdrop-blur-sm">
          <div className="space-y-3">
            <Textarea
              placeholder="Type your message..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault()
                  handleTextSubmit()
                }
              }}
              className="min-h-24 resize-none border-0 bg-transparent text-base focus-visible:ring-0"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMode("collapsed")
                  setTextInput("")
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleTextSubmit}
                disabled={!textInput.trim()}
                className="min-w-20"
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Recording Mode */}
      {mode === "voice" && (
        <div className="ml-auto max-w-md rounded-2xl border bg-card/95 p-6 shadow-xl backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div
              className={`recording-pulse flex h-20 w-20 items-center justify-center rounded-full ${
                voice.isRecording && !voice.isPaused
                  ? "bg-destructive"
                  : "bg-muted"
              }`}
            >
              <div
                className={`h-4 w-4 rounded-full ${
                  voice.isRecording && !voice.isPaused
                    ? "bg-destructive-foreground"
                    : "bg-muted-foreground"
                }`}
              />
            </div>
            <div className="space-y-1 text-center">
              <p className="text-2xl font-bold font-mono tabular-nums">
                {formatTime(voice.recordingTime)}
              </p>
              <p className="text-sm text-muted-foreground">
                {voice.isStarting
                  ? "Starting…"
                  : voice.isPaused
                    ? "Paused"
                    : voice.isRecording
                      ? "Recording..."
                      : voice.hasRecording
                        ? `Recording ready: ${formatTime(voice.recordingTime)}`
                        : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {voice.hasRecording && !voice.isRecording ? (
                <>
                  <Button variant="ghost" size="sm" onClick={voice.discard}>
                    Discard
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleVoiceSubmit}
                    className="min-w-20"
                  >
                    Submit
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={voice.isPaused ? voice.resume : voice.pause}
                    disabled={
                      voice.isStarting ||
                      (!voice.isRecording && !voice.isPaused)
                    }
                  >
                    {voice.isPaused ? "Resume" : "Pause"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={voice.stop}
                    disabled={voice.isStarting || !voice.isRecording}
                  >
                    Stop
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleVoiceSubmit}
                    className="min-w-20"
                    disabled={voice.isStarting}
                  >
                    Submit
                  </Button>
                </>
              )}
              {!voice.isRecording && !voice.hasRecording && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    voice.discard()
                    setMode("collapsed")
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
