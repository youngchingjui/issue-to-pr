"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/lib/hooks/use-toast"

// Helper to fully stop an active MediaRecorder & its tracks.
function stopRecorder(recorder: MediaRecorder | null) {
  if (!recorder) return
  if (recorder.state !== "inactive") {
    recorder.stop()
  }
  // On some browsers (notably Safari on iOS) calling recorder.stop() does **not**
  // stop the underlying MediaStream tracks which keeps the microphone active.
  // Ensure they are stopped explicitly.
  recorder.stream?.getTracks().forEach((t) => t.stop())
}

export default function SpeechToTextCard() {
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])

  const [transcript, setTranscript] = useState("")
  const [isTranscribing, setIsTranscribing] = useState(false)
  // Store the recorded audio so we can allow playback
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordedMimeType, setRecordedMimeType] = useState<string | null>(null)

  const { toast } = useToast()

  // Clean-up when component unmounts
  useEffect(() => {
    return () => {
      stopRecorder(mediaRecorder)
    }
  }, [audioUrl, mediaRecorder])

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({
        description: "Your browser does not support audio recording.",
        variant: "destructive",
      })
      return
    }

    try {
      // If we have a previous audio URL, revoke and clear it when starting a fresh recording
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
        setAudioUrl(null)
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Try to use a more compatible format, fallback to default
      let mimeType = ""
      const supportedTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/wav",
      ]

      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type
          break
        }
      }

      console.log("Using MIME type:", mimeType || "default")
      setRecordedMimeType(mimeType || "audio/webm")

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data)
      }
      recorder.onstop = handleRecordingStop
      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
    } catch {
      toast({
        description: "Unable to access microphone.",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    stopRecorder(mediaRecorder)
  }

  const handleRecordingStop = useCallback(async () => {
    setIsRecording(false)

    // Ensure microphone is released as soon as recording stops.
    stopRecorder(mediaRecorder)
    setMediaRecorder(null)

    const actualMimeType = recordedMimeType || "audio/webm"
    const blob = new Blob(audioChunks.current, { type: actualMimeType })
    audioChunks.current = []

    console.log("blob", blob, "MIME type:", actualMimeType, "size:", blob.size)

    // Allow playback of the recorded audio
    const url = URL.createObjectURL(blob)
    setAudioUrl(url)

    // Send to server for transcription
    const fileExtension = actualMimeType.includes("mp4")
      ? "mp4"
      : actualMimeType.includes("wav")
        ? "wav"
        : "webm"
    const audioFile = new File([blob], `recording.${fileExtension}`, {
      type: actualMimeType,
    })

    setIsTranscribing(true)
    try {
      const formData = new FormData()
      formData.append("audio", audioFile)

      const response = await fetch("/api/openai/transcribe", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setTranscript(data.text)
    } catch (err) {
      toast({ description: String(err), variant: "destructive" })
    } finally {
      setIsTranscribing(false)
    }
  }, [mediaRecorder, toast, recordedMimeType])

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
                console.error("Audio playback error:", e)
                toast({
                  description: `Audio error: ${e.currentTarget.error?.message || "Unknown error"}`,
                  variant: "destructive",
                })
              }}
              onLoadStart={() => console.log("Audio loading started")}
              onCanPlay={() => console.log("Audio can play")}
            />
            {recordedMimeType && (
              <p className="text-xs text-muted-foreground">
                Format: {recordedMimeType}
              </p>
            )}
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
        </div>
      </CardContent>
    </Card>
  )
}
