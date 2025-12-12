// This is another hook for using voice that's mainly for the input pill component.
// Ideally, we'd combine this with useVoiceDictation into a single hook.
// It injects the VoiceService implementation
// And conducts those services, along with managing the state

import { useEffect, useRef, useState } from "react"

import { VoicePort, VoiceState, VoiceSubmitPort } from "../types/voice"

export function useVoice<TReturn = unknown>(
  voicePortFactory: () => VoicePort,
  submitPort?: VoiceSubmitPort<TReturn>
) {
  const [state, setState] = useState<VoiceState>("idle")
  const [port] = useState<VoicePort>(() => voicePortFactory())
  const [hasRecording, setHasRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)

  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastBlobRef = useRef<Blob | null>(null)
  const lastMimeTypeRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const unsubscribe = port.subscribe((e) => {
      if (e.type === "state") setState(e.state)
      if (e.type === "ready") {
        setHasRecording(true)
        lastBlobRef.current = e.audioBlob
        lastMimeTypeRef.current = e.audioBlob.type
        stopTimer()
      }
      if (e.type === "error") {
        setState("error")
        stopTimer()
      }
      if (e.type === "time") {
        setRecordingTime(e.recordingTimeSec)
      }
    })
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [port])

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

  async function start() {
    setHasRecording(false)
    setRecordingTime(0)
    setState("starting")
    await port.start()
    setState("recording")
    startTimer()
  }

  async function pause() {
    port.pause()
    setState("paused")
    stopTimer()
  }

  async function resume() {
    port.resume()
    setState("recording")
    startTimer()
  }

  async function stop() {
    port.stop()
    setState("idle")
    stopTimer()
  }

  async function submit() {
    if (!submitPort) throw new Error("No submit port configured")
    const blob = lastBlobRef.current
    if (!blob) throw new Error("No recording available to submit")

    setState("submitting")
    try {
      const result = await submitPort.submit(blob, lastMimeTypeRef.current)
      setState("idle")
      return result
    } catch (e) {
      setState("error")
      throw e
    }
  }

  async function discard() {
    port.discard()
    setHasRecording(false)
    setState("idle")
    stopTimer()
    setRecordingTime(0)
    lastBlobRef.current = null
    lastMimeTypeRef.current = undefined
  }

  return {
    state,
    setState,
    hasRecording,
    recordingTime,
    recordingIntervalRef,
    setRecordingTime,
    setHasRecording,
    stopTimer,
    startTimer,
    start,
    pause,
    resume,
    stop,
    submit,
    discard,
  }
}

