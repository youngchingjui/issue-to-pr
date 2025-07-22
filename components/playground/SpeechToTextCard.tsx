"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/lib/hooks/use-toast"

export default function SpeechToTextCard() {
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])

  const [transcript, setTranscript] = useState("")
  const [isTranscribing, setIsTranscribing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    return () => {
      // Cleanup recorder on unmount
      mediaRecorder?.stream.getTracks().forEach((t) => t.stop())
    }
  }, [mediaRecorder])

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({
        description: "Your browser does not support audio recording.",
        variant: "destructive",
      })
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data)
      }
      recorder.onstop = handleRecordingStop
      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
    } catch (err) {
      toast({ description: "Unable to access microphone." })
    }
  }

  const stopRecording = () => {
    mediaRecorder?.stop()
  }

  const handleRecordingStop = useCallback(async () => {
    setIsRecording(false)
    const blob = new Blob(audioChunks.current, { type: "audio/webm" })
    audioChunks.current = []

    // Send to server
    const formData = new FormData()
    formData.append("file", blob, "recording.webm")

    setIsTranscribing(true)
    try {
      const res = await fetch("/api/openai/transcribe", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to transcribe")
      setTranscript(data.text as string)
    } catch (err) {
      toast({ description: String(err), variant: "destructive" })
    } finally {
      setIsTranscribing(false)
    }
  }, [toast])

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
        <div className="flex items-center gap-4">
          {isRecording ? (
            <Button variant="destructive" onClick={stopRecording} disabled={isTranscribing}>
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

