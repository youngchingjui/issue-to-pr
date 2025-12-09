// This is another hook for using voice that's mainly for the input pill component.
// Ideally, we'd combine this with useVoiceDictation into a single hook.
// It injects the VoiceService implementation
// And conducts those services, along with managing the state

import { useRef, useState } from "react"

import { VoicePort, VoiceState } from "../types/voice"

export function useVoice(voicePortFactory: () => VoicePort) {
  const [state, setState] = useState<VoiceState>("idle")
  const [port] = useState<VoicePort>(() => voicePortFactory())
  const [hasRecording, setHasRecording] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)

  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)

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
    setIsStarting(true)
    await port.start()
    setIsRecording(true)
    setState("recording")
    startTimer()
    setIsStarting(false)
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
    setIsRecording(false)
    setState("idle")
    stopTimer()
  }

  async function discard() {
    port.discard()
    setHasRecording(false)
    setIsRecording(false)
    setState("idle")
    stopTimer()
    setRecordingTime(0)
  }

  return {
    state,
    setState,
    isRecording,
    isStarting,
    hasRecording,
    recordingTime,
    recordingIntervalRef,
    setIsRecording,
    setRecordingTime,
    setHasRecording,
    stopTimer,
    startTimer,
    start,
    pause,
    resume,
    stop,
    discard,
  }
}
