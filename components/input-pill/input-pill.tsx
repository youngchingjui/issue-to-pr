"use client"

import { useEffect, useRef, useState } from "react"

import { StatusTicker } from "@/components/input-pill/status-ticker"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

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
}

export default function InputPill({
  onSubmit,
  jobs = [],
  onRevealJob,
  onSeeAllPreviews,
}: InputPillProps) {
  const [mode, setMode] = useState<"collapsed" | "text" | "voice">("collapsed")
  const [textInput, setTextInput] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [hasRecording, setHasRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isStarting, setIsStarting] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)

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

  const startTimer = () => {
    if (recordingIntervalRef.current) return
    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1)
    }, 1000)
  }

  const stopTimer = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }
  }

  const startRecording = async () => {
    try {
      setHasRecording(false)
      setIsStarting(true)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        })
        console.log("[v0] Recording completed:", audioBlob.size, "bytes")
        setHasRecording(true)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setIsPaused(false)
      // Start timer
      startTimer()
      setIsStarting(false)

      console.log("[v0] Recording started")
    } catch (error) {
      console.error("[v0] Error accessing microphone:", error)
      alert(
        "Could not access microphone. Please grant permission and try again."
      )
      setIsStarting(false)
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      try {
        mediaRecorderRef.current.pause()
        setIsPaused(true)
        stopTimer()
        console.log("[v0] Recording paused")
      } catch (e) {
        console.error("[v0] Unable to pause recording:", e)
      }
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      try {
        mediaRecorderRef.current.resume()
        setIsPaused(false)
        startTimer()
        console.log("[v0] Recording resumed")
      } catch (e) {
        console.error("[v0] Unable to resume recording:", e)
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop()
      } catch (e) {
        console.error("[v0] Unable to stop recording:", e)
      }
      setIsRecording(false)
      setIsPaused(false)
      stopTimer()
      console.log("[v0] Recording stopped")
    }
  }

  const discardRecording = () => {
    // Discard any recorded audio and reset state
    audioChunksRef.current = []
    setHasRecording(false)
    setIsRecording(false)
    setIsPaused(false)
    stopTimer()
    setRecordingTime(0)
  }

  const handleVoiceSubmit = () => {
    // Ensure we don't keep recording in the background
    if (isRecording) stopRecording()

    // Optimistic: fire-and-forget, collapse UI immediately
    onSubmit(`Voice recording (${recordingTime}s)`, true).catch((e) =>
      console.error("[v0] Voice submit error:", e)
    )

    // Reset voice UI state
    discardRecording()
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

  const handleMicTap = () => {
    setMode("voice")
    // Immediately request mic access and begin recording on first tap
    startRecording()
  }

  // Render a stack of status pills (processing and ready)
  const hasJobs = jobs && jobs.length > 0
  const jobsInRenderOrder = [...jobs] // newest last so it appears closest to the split button

  return (
    <div className="fixed bottom-0 right-0 z-50 flex justify-end p-4 pointer-events-none">
      <div className="w-full max-w-2xl pointer-events-auto slide-up">
        {/* Floating status pills */}
        {hasJobs && (
          <div className="mb-2 flex w-full justify-end">
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
          <div ref={splitRef} className="relative w-full flex justify-end">
            <div className="inline-flex items-center gap-px rounded-full border bg-card/95 p-1 shadow-lg backdrop-blur-sm">
              <Button
                size="icon-lg"
                variant="ghost"
                className="rounded-l-full hover:bg-accent"
                onClick={handleMicTap}
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
                  isRecording && !isPaused ? "bg-destructive" : "bg-muted"
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full ${isRecording && !isPaused ? "bg-destructive-foreground" : "bg-muted-foreground"}`}
                />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-2xl font-bold font-mono tabular-nums">
                  {formatTime(recordingTime)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isStarting
                    ? "Starting…"
                    : isPaused
                      ? "Paused"
                      : isRecording
                        ? "Recording..."
                        : hasRecording
                          ? `Recording ready: ${formatTime(recordingTime)}`
                          : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {hasRecording && !isRecording ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={discardRecording}
                    >
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
                      onClick={isPaused ? resumeRecording : pauseRecording}
                      disabled={isStarting || (!isRecording && !isPaused)}
                    >
                      {isPaused ? "Resume" : "Pause"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={stopRecording}
                      disabled={isStarting || !isRecording}
                    >
                      Stop
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleVoiceSubmit}
                      className="min-w-20"
                      disabled={isStarting}
                    >
                      Submit
                    </Button>
                  </>
                )}
                {!isRecording && !hasRecording && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      discardRecording()
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
    </div>
  )
}
