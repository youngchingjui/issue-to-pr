"use client"

import { Loader2, Mic, RotateCcw } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useVoiceDictation } from "@/lib/hooks/useVoiceDictation"

function SkeletonLines({ lines = 4 }: { lines?: number }) {
  const widths = useMemo(
    () =>
      Array.from({ length: lines }, (_, i) => {
        const base = 90 - i * 10
        const jitter = Math.max(50, base) + (i % 2 === 0 ? 5 : -7)
        return Math.max(40, Math.min(95, jitter))
      }),
    [lines]
  )

  return (
    <div className="animate-pulse space-y-2">
      {widths.map((w, i) => (
        <div
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          className="h-3 rounded-md bg-muted"
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
  )
}

export default function MicrophoneRecordingDraft() {
  const {
    isRecording,
    isTranscribing,
    transcript,
    audioUrl,
    lastError,
    startRecording,
    stopRecording,
    retryTranscription,
  } = useVoiceDictation()

  // Playground-only override state so we can manually demo transitions
  const [override, setOverride] = useState<
    | null
    | {
        recording?: boolean
        transcribing?: boolean
        error?: boolean
        transcript?: string
        audioUrl?: string | null
      }
  >(null)

  const ui = {
    recording: override?.recording ?? isRecording,
    transcribing: override?.transcribing ?? isTranscribing,
    error: override?.error ?? Boolean(lastError),
    transcript: override?.transcript ?? transcript,
    audioUrl: override?.audioUrl ?? audioUrl,
  }

  // Clear manual overrides if the real hook starts a new recording
  useEffect(() => {
    if (isRecording) setOverride(null)
  }, [isRecording])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Microphone Recording UI (Draft)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-2">
          <Label htmlFor="draft-transcript">Transcript</Label>
          <div
            id="draft-transcript"
            className="relative min-h-28 w-full rounded-md border bg-background p-3 text-sm"
          >
            {/* Loading skeleton */}
            {ui.transcribing ? (
              <div className="opacity-100 transition-opacity duration-300">
                <SkeletonLines lines={5} />
              </div>
            ) : null}

            {/* Error state with playback + retry */}
            {!ui.transcribing && ui.error ? (
              <div className="flex flex-col gap-3">
                <div className="text-sm text-red-600">
                  Transcription failed. You can playback the audio, retry, or
                  download it.
                </div>
                {ui.audioUrl ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <audio controls src={ui.audioUrl} className="w-full" />
                ) : null}
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={retryTranscription}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Retry transcribe
                  </Button>
                  {ui.audioUrl ? (
                    <a
                      href={ui.audioUrl}
                      download
                      className="text-xs underline underline-offset-2 hover:opacity-80"
                    >
                      Download audio
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Success (or idle) text */}
            {!ui.transcribing && !ui.error ? (
              <div className="whitespace-pre-wrap">
                {ui.transcript ? (
                  <span>{ui.transcript}</span>
                ) : (
                  <span className="text-muted-foreground">
                    Your transcript will appear here after recording.
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </section>

        <section className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={ui.recording ? stopRecording : startRecording}
            // Keep active during transcription per spec; do not disable.
            className={`${ui.recording ? "animate-pulse" : ""}`}
            size={ui.recording ? undefined : "icon"}
            aria-label={ui.recording ? "Stop Recording" : "Start Recording"}
          >
            {ui.transcribing ? (
              // We show a subtle spinner inside but keep button active
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : ui.recording ? (
              <>
                <Mic className="mr-2 h-4 w-4" /> Listening...
              </>
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <div className="text-xs text-muted-foreground">
            Click to {ui.recording ? "stop" : "start"} recording. While
            transcribing, the mic remains active so you can start another
            recording immediately.
          </div>
        </section>

        {/* Playground controls to force states */}
        <section className="rounded-md border p-3">
          <div className="mb-2 text-sm font-medium">Playground Controls</div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setOverride(null)}>
              Clear overrides
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setOverride({ recording: true, transcribing: false, error: false })
              }
            >
              Simulate Recording
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setOverride({ recording: false, transcribing: true, error: false })
              }
            >
              Simulate Transcribing
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setOverride({
                  recording: false,
                  transcribing: false,
                  error: false,
                  transcript:
                    "Hi! This is a sample transcription result that replaces the loading skeleton.",
                })
              }
            >
              Simulate Success
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setOverride({
                  recording: false,
                  transcribing: false,
                  error: true,
                  transcript: "",
                })
              }
            >
              Simulate Error
            </Button>
          </div>
        </section>
      </CardContent>
    </Card>
  )
}

