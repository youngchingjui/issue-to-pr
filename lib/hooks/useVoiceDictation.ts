"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useToast } from "@/lib/hooks/use-toast"

// Helper to fully stop an active MediaRecorder & its tracks.
function stopRecorder(recorder: MediaRecorder | null) {
  if (!recorder) return
  if (recorder.state !== "inactive") {
    recorder.stop()
  }
  // On some browsers (notably Safari on iOS) calling recorder.stop() does not
  // stop the underlying MediaStream tracks which keeps the microphone active.
  // Ensure they are stopped explicitly.
  recorder.stream?.getTracks().forEach((t) => t.stop())
}

// Rudimentary iOS Safari detection (best-effort)
function isIOSSafari() {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua)
  return isIOS && isSafari
}

export type UseVoiceDictationOptions = {
  onTranscribed?: (text: string) => void
}

export function useVoiceDictation(options?: UseVoiceDictationOptions) {
  const { onTranscribed } = options || {}
  const { toast } = useToast()

  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])

  const [transcript, setTranscript] = useState("")
  const [isTranscribing, setIsTranscribing] = useState(false)
  // Store the recorded audio so we can allow playback
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordedMimeType, setRecordedMimeType] = useState<string | null>(null)

  // Debugging state for visibility on mobile Safari where console isn't accessible
  const [debugLog, setDebugLog] = useState<string[]>([])
  const [lastError, setLastError] = useState<string | null>(null)
  const [serverRawResponse, setServerRawResponse] = useState<string | null>(
    null
  )
  const [recordingInfo, setRecordingInfo] = useState<null | {
    chunkCount: number
    mimeType: string
    blobSize: number
    urlOk: boolean
    objectUrl?: string
  }>(null)

  // Streaming-specific state
  const sessionIdRef = useRef<string | null>(null)
  const seqRef = useRef<number>(0)
  const sseRef = useRef<EventSource | null>(null)

  const pushDebug = useCallback((msg: string) => {
    const line = `${new Date().toISOString()} ${msg}`
    // eslint-disable-next-line no-console
    console.log("[VoiceDictation][Debug]", line)
    setDebugLog((prev) => [...prev, line].slice(-200))
  }, [])

  // Clean-up when component using this hook unmounts
  useEffect(() => {
    return () => {
      stopRecorder(mediaRecorder)
      if (sseRef.current) {
        sseRef.current.close()
        sseRef.current = null
      }
    }
  }, [audioUrl, mediaRecorder])

  const startRecording = async () => {
    pushDebug("startRecording invoked")
    if (!navigator.mediaDevices?.getUserMedia) {
      const msg = "Your browser does not support audio recording."
      setLastError(msg)
      toast({ description: msg, variant: "destructive" })
      return
    }

    try {
      // If we have a previous audio URL, revoke and clear it when starting a fresh recording
      if (audioUrl) {
        try {
          URL.revokeObjectURL(audioUrl)
          pushDebug("Revoked previous object URL")
        } catch (e) {
          pushDebug(`Failed to revoke previous object URL: ${String(e)}`)
        }
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
        try {
          if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type
            break
          }
        } catch (e) {
          // Some browsers may throw if given a weird string
          pushDebug(`isTypeSupported threw for ${type}: ${String(e)}`)
        }
      }

      pushDebug(
        `Starting MediaRecorder with MIME type: ${mimeType || "default"}`
      )
      setRecordedMimeType(mimeType || "audio/webm")

      // Create a new session id for this recording
      const sessionId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`
      sessionIdRef.current = sessionId
      seqRef.current = 0

      // Start SSE subscription for live transcript updates
      if (sseRef.current) {
        try {
          sseRef.current.close()
        } catch {}
      }
      const es = new EventSource(`/api/workflow/${sessionId}`)
      sseRef.current = es
      setServerRawResponse("<SSE: connected>")

      es.onmessage = (ev) => {
        try {
          const event = JSON.parse(ev.data)
          if (
            event?.type === "status" &&
            (event?.data?.status === "transcription_update" ||
              event?.data?.status === "completed")
          ) {
            const final = event?.data?.final || ""
            const provisional = event?.data?.provisional || ""
            const combined = [final, provisional].filter(Boolean).join(" ")
            setTranscript(combined)
            if (onTranscribed) onTranscribed(combined)
            if (event?.data?.status === "completed") {
              pushDebug("SSE completed")
              try {
                es.close()
              } catch {}
              sseRef.current = null
            }
          }
        } catch (e) {
          // ignore non-JSON payloads like the initial connection event
        }
      }

      es.onerror = (e) => {
        pushDebug(`[SSE] error: ${String(e)}`)
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      recorder.ondataavailable = async (e) => {
        if (!e.data || e.data.size === 0) return
        audioChunks.current.push(e.data)
        // Send the slice immediately to the backend for ingestion
        const currentSeq = seqRef.current++
        try {
          await fetch(
            `/api/transcription/ingest?sessionId=${sessionId}&seq=${currentSeq}`,
            {
              method: "POST",
              headers: { "Content-Type": mimeType || "audio/webm" },
              body: e.data,
            }
          )
          pushDebug(`Uploaded chunk seq=${currentSeq} size=${e.data.size}`)
        } catch (err) {
          pushDebug(`[Chunk Upload] Failed seq=${currentSeq}: ${String(err)}`)
        }
      }

      recorder.onstop = async () => {
        pushDebug("MediaRecorder stopped (onstop)")
        // Finalize the transcript: tell server to commit provisional into final
        if (sessionIdRef.current) {
          try {
            await fetch(
              `/api/transcription/finalize?sessionId=${sessionIdRef.current}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
              }
            )
            pushDebug("Finalize request sent")
          } catch (e) {
            pushDebug(`[Finalize] Failed: ${String(e)}`)
          }
        }
        // After stopping, assemble a local blob for playback UI
        await handleRecordingStop()
      }

      // Use 3s timeslices to keep chunks small
      const TIMESLICE_MS = 3000
      recorder.start(TIMESLICE_MS)
      pushDebug(`MediaRecorder started. state=${recorder.state}`)
      setMediaRecorder(recorder)
      setIsRecording(true)
      setRecordingInfo(null)
      setTranscript("")
      setLastError(null)
    } catch (err) {
      const msg = `[startRecording] Error: ${String(err)}`
      setLastError(msg)
      pushDebug(msg)
      toast({
        description: "Unable to access microphone.",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    pushDebug("stopRecording invoked")
    stopRecorder(mediaRecorder)
  }

  const handleRecordingStop = useCallback(async () => {
    // This function now only assembles the playback blob; transcription is streamed incrementally.
    pushDebug(
      `handleRecordingStop invoked – assembling blob from ${audioChunks.current.length} chunks`
    )

    // Ensure microphone is released as soon as recording stops.
    stopRecorder(mediaRecorder)
    setMediaRecorder(null)
    setIsRecording(false)

    const actualMimeType = recordedMimeType || "audio/webm"

    let blob: Blob
    try {
      blob = new Blob(audioChunks.current, { type: actualMimeType })
    } catch (e) {
      const msg = `[handleRecordingStop] Failed to create Blob with type '${actualMimeType}': ${String(e)}`
      setLastError(msg)
      pushDebug(msg)
      // Try creating a Blob without a type as a fallback
      try {
        blob = new Blob(audioChunks.current)
        pushDebug("Created Blob without explicit type as fallback")
      } catch (e2) {
        const msg2 = `[handleRecordingStop] Also failed to create Blob without type: ${String(e2)}`
        setLastError(msg2)
        pushDebug(msg2)
        audioChunks.current = []
        return
      }
    }

    audioChunks.current = []

    pushDebug(`[Blob] Created. mimeType=${actualMimeType}, size=${blob.size}`)

    // Allow playback of the recorded audio
    let urlOk = true
    let url: string | null = null
    try {
      url = URL.createObjectURL(blob)
      setAudioUrl(url)
      pushDebug(`[ObjectURL] Created: ${url}`)
    } catch (e) {
      urlOk = false
      const msg = `[ObjectURL] Failed to create: ${String(e)}`
      setLastError(msg)
      pushDebug(msg)
      setAudioUrl(null)
    }

    setRecordingInfo({
      chunkCount: 0, // we already consumed chunks; keep 0 to avoid confusion
      mimeType: actualMimeType,
      blobSize: blob.size,
      urlOk,
      objectUrl: url || undefined,
    })

    // Indicate we are not in a single-shot transcription anymore
    setIsTranscribing(false)
  }, [mediaRecorder, recordedMimeType, pushDebug])

  const iosSafariHint = useMemo(
    () =>
      isIOSSafari()
        ? "Note: iOS Safari can have issues with long recordings (>30s)."
        : null,
    []
  )

  return {
    // state
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
    // actions
    startRecording,
    stopRecording,
  }
}
