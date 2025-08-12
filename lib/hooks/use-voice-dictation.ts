"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

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

export type UseVoiceDictationOptions = {
  // Called when a transcription is successfully returned from the server
  onTranscribed?: (text: string) => void
}

export function useVoiceDictation(options?: UseVoiceDictationOptions) {
  const onTranscribed = options?.onTranscribed

  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])

  const [transcript, setTranscript] = useState("")
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordedMimeType, setRecordedMimeType] = useState<string | null>(null)

  const [debugLog, setDebugLog] = useState<string[]>([])
  const [lastError, setLastError] = useState<string | null>(null)
  const [serverRawResponse, setServerRawResponse] = useState<string | null>(
    null
  )

  const pushDebug = useCallback((msg: string) => {
    const line = `${new Date().toISOString()} ${msg}`
    // eslint-disable-next-line no-console
    console.log("[VoiceDictation][Debug]", line)
    setDebugLog((prev) => [...prev, line].slice(-200))
  }, [])

  // Clean-up when component using the hook unmounts
  useEffect(() => {
    return () => {
      stopRecorder(mediaRecorder)
      if (audioUrl) {
        try {
          URL.revokeObjectURL(audioUrl)
        } catch {
          // ignore
        }
      }
    }
  }, [mediaRecorder, audioUrl])

  const handleRecordingStop = useCallback(async () => {
    pushDebug(
      `handleRecordingStop invoked – assembling blob from ${audioChunks.current.length} chunks`
    )
    setIsRecording(false)

    // Ensure microphone is released as soon as recording stops.
    stopRecorder(mediaRecorder)
    setMediaRecorder(null)

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
    try {
      if (audioUrl) {
        try {
          URL.revokeObjectURL(audioUrl)
        } catch {
          // ignore
        }
      }
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      pushDebug(`[ObjectURL] Created: ${url}`)
    } catch (e) {
      const msg = `[ObjectURL] Failed to create: ${String(e)}`
      setLastError(msg)
      pushDebug(msg)
      setAudioUrl(null)
    }

    // Send to server for transcription
    const fileExtension = actualMimeType.includes("mp4")
      ? "mp4"
      : actualMimeType.includes("wav")
        ? "wav"
        : actualMimeType.includes("webm")
          ? "webm"
          : "bin"

    let audioFile: File
    try {
      audioFile = new File([blob], `recording.${fileExtension}`, {
        type: actualMimeType,
      })
      pushDebug(
        `[File] Created name=recording.${fileExtension} type=${actualMimeType} size=${audioFile.size}`
      )
    } catch (e) {
      const msg = `[File] Failed to create: ${String(e)}`
      setLastError(msg)
      pushDebug(msg)
      return
    }

    setIsTranscribing(true)
    try {
      const formData = new FormData()
      formData.append("audio", audioFile)

      pushDebug("Sending POST /api/openai/transcribe")
      const response = await fetch("/api/openai/transcribe", {
        method: "POST",
        body: formData,
      })

      pushDebug(`Fetch response received. status=${response.status}`)

      if (!response.ok) {
        // Try to read raw text to aid debugging
        const raw = await response.text().catch(() => "<failed to read body>")
        setServerRawResponse(raw)
        pushDebug(`[Server] Non-OK response body: ${raw?.slice(0, 500)}`)
        let errorData: unknown = null
        try {
          errorData = JSON.parse(raw)
        } catch {
          // ignore
        }
        if (
          errorData &&
          typeof errorData === "object" &&
          "error" in errorData &&
          typeof (errorData as { error: unknown }).error === "string"
        ) {
          throw new Error((errorData as { error: string }).error)
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const raw = await response.text()
      setServerRawResponse(raw)
      let dataUnknown: unknown
      try {
        dataUnknown = JSON.parse(raw)
      } catch (e) {
        const msg = `[Client] Failed to parse JSON: ${String(e)} — raw: ${raw?.slice(0, 200)}`
        setLastError(msg)
        pushDebug(msg)
        return
      }

      if (
        !dataUnknown ||
        typeof dataUnknown !== "object" ||
        !("text" in dataUnknown) ||
        typeof (dataUnknown as { text: unknown }).text !== "string"
      ) {
        const msg = `[Client] Unexpected response shape: ${raw?.slice(0, 200)}`
        setLastError(msg)
        pushDebug(msg)
        return
      }

      pushDebug("Transcription successful")
      const text = (dataUnknown as { text: string }).text
      setTranscript(text)
      if (onTranscribed) onTranscribed(text)
    } catch (err) {
      const msg = `[Transcribe] Failed: ${String(err)}`
      setLastError(msg)
      pushDebug(msg)
    } finally {
      setIsTranscribing(false)
    }
  }, [mediaRecorder, recordedMimeType, pushDebug, onTranscribed, audioUrl])

  const startRecording = useCallback(async () => {
    pushDebug("startRecording invoked")
    if (!navigator.mediaDevices?.getUserMedia) {
      const msg = "Your browser does not support audio recording."
      setLastError(msg)
      return { ok: false, error: msg }
    }

    try {
      // If we have a previous audio URL, revoke and clear it when starting fresh
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

      pushDebug(`Starting MediaRecorder with MIME type: ${mimeType || "default"}`)
      setRecordedMimeType(mimeType || "audio/webm")

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data)
      }
      recorder.onstop = handleRecordingStop
      recorder.start()
      pushDebug(`MediaRecorder started. state=${recorder.state}`)
      setMediaRecorder(recorder)
      setIsRecording(true)
      setServerRawResponse(null)
      setTranscript("")
      setLastError(null)
      return { ok: true }
    } catch (err) {
      const msg = `[startRecording] Error: ${String(err)}`
      setLastError(msg)
      pushDebug(msg)
      return { ok: false, error: msg }
    }
  }, [audioUrl, pushDebug, handleRecordingStop])

  const stopRecording = useCallback(() => {
    pushDebug("stopRecording invoked")
    stopRecorder(mediaRecorder)
  }, [mediaRecorder, pushDebug])

  const state = useMemo(
    () => ({
      isRecording,
      isTranscribing,
      transcript,
      setTranscript,
      audioUrl,
      recordedMimeType,
      debugLog,
      lastError,
      serverRawResponse,
    }),
    [
      isRecording,
      isTranscribing,
      transcript,
      audioUrl,
      recordedMimeType,
      debugLog,
      lastError,
      serverRawResponse,
    ]
  )

  const api = useMemo(
    () => ({ startRecording, stopRecording, pushDebug }),
    [startRecording, stopRecording, pushDebug]
  )

  return { ...state, ...api }
}

