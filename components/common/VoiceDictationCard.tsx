"use client"

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
import { useVoiceDictation } from "@/lib/hooks/useVoiceDictation"

export default function VoiceDictationCard() {
  const {
    isRecording,
    isTranscribing,
    transcript,
    setTranscript,
    audioUrl,
    recordedMimeType,
    lastError,
    debugLog,
    serverRawResponse,
    recordingInfo,
    iosSafariHint,
    hasRecording,
    startRecording,
    stopRecording,
    retryTranscription,
  } = useVoiceDictation()

  const { toast } = useToast()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcript)
      toast({ description: "Copied transcription to clipboard." })
    } catch {
      toast({ description: "Failed to copy.", variant: "destructive" })
    }
  }

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
              }}
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

        <div className="flex flex-wrap items-center gap-4">
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
            variant="secondary"
            onClick={retryTranscription}
            disabled={!hasRecording || isRecording || isTranscribing}
          >
            Retry Transcription
          </Button>
        </div>

        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Show Debug
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-md border p-3 text-xs">
              <div className="mb-2 font-medium">Debug Info</div>
              {lastError && (
                <div className="mb-2 text-red-600">Last error: {lastError}</div>
              )}
              {recordingInfo && (
                <div className="mb-2 space-y-1">
                  <div>Recorded MIME type: {recordingInfo.mimeType}</div>
                  <div>Blob size: {recordingInfo.blobSize} bytes</div>
                  <div>Object URL created: {String(recordingInfo.urlOk)}</div>
                  {recordingInfo.objectUrl && (
                    <div className="truncate">
                      Object URL: {recordingInfo.objectUrl}
                    </div>
                  )}
                </div>
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

