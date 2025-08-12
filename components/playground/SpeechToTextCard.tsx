"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/lib/hooks/use-toast"
import { useVoiceDictation } from "@/lib/hooks/use-voice-dictation"

// Rudimentary iOS Safari detection (best-effort)
function isIOSSafari() {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua)
  return isIOS && isSafari
}

export default function SpeechToTextCard() {
  const [debugOpen, setDebugOpen] = useState(false)
  const { toast } = useToast()

  const {
    isRecording,
    isTranscribing,
    transcript,
    setTranscript,
    audioUrl,
    recordedMimeType,
    debugLog,
    lastError,
    serverRawResponse,
    startRecording,
    stopRecording,
    pushDebug,
  } = useVoiceDictation()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcript)
      toast({ description: "Copied transcription to clipboard." })
    } catch {
      toast({ description: "Failed to copy.", variant: "destructive" })
    }
  }

  const iosSafariHint = useMemo(
    () =>
      isIOSSafari()
        ? "Note: iOS Safari can have issues with long recordings (>30s). This debug panel surfaces low-level details to help troubleshoot."
        : null,
    []
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Speech ➜ Text (Whisper)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {iosSafariHint && (
          <p className="text-xs text-muted-foreground">{iosSafariHint}</p>
        )}

        <div className="space-y-2">
          <Label>Transcription</Label>
          <Textarea
            rows={6}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Press the microphone, speak, then stop to transcribe..."
          />
        </div>

        {/* Playback UI */}
        {audioUrl && (
          <div className="space-y-2">
            <Label>Playback</Label>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio
              controls
              src={audioUrl}
              className="w-full"
              onError={(e) => {
                // eslint-disable-next-line no-console
                console.error("Audio playback error:", e)
                const msg = `Audio error: ${e.currentTarget.error?.message || "Unknown error"}`
                pushDebug(msg)
                toast({ description: msg, variant: "destructive" })
              }}
              onLoadStart={() => pushDebug("Audio loading started")}
              onCanPlay={() => pushDebug("Audio can play")}
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {recordedMimeType && <span>Format: {recordedMimeType}</span>}
              {audioUrl && (
                <a
                  href={audioUrl}
                  download
                  className="underline-offset-2 hover:underline"
                >
                  Download recording
                </a>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          {isRecording ? (
            <Button
              variant="destructive"
              onClick={stopRecording}
              disabled={isTranscribing}
            >
              Stop Recording
            </Button>
          ) : (
            <Button onClick={startRecording} disabled={isTranscribing}>
              {isTranscribing ? "Transcribing..." : "Start Recording"}
            </Button>
          )}
          <Button variant="outline" onClick={handleCopy} disabled={!transcript}>
            Copy
          </Button>
          <Button
            variant="outline"
            onClick={() => setDebugOpen((v) => !v)}
            className="ml-auto"
          >
            {debugOpen ? "Hide Debug" : "Show Debug"}
          </Button>
        </div>

        <Collapsible open={debugOpen} onOpenChange={setDebugOpen}>
          <CollapsibleTrigger asChild>
            {/* Hidden trigger so button controls it above */}
            <span className="hidden" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-md border p-3 text-xs">
              <div className="mb-2 font-medium">Debug Info</div>
              {lastError && (
                <div className="mb-2 text-red-600">Last error: {lastError}</div>
              )}
              {serverRawResponse && (
                <div className="mb-2">
                  <div className="font-medium">Server raw response</div>
                  <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2">
                    {serverRawResponse}
                  </pre>
                </div>
              )}
              <div className="font-medium">Event log</div>
              <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2">
                {debugLog.join("\n")}
              </pre>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

