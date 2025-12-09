// This is another hook for using voice that's mainly for the input pill component.
// Ideally, we'd combine this with useVoiceDictation into a single hook.
// It injects the VoiceService implementation
// And conducts those services, along with managing the state

import { useRef, useState } from "react"

import { VoicePort, VoiceState } from "../types/voice"

export function useVoice(voicePortFactory: () => VoicePort) {
  const [state, setState] = useState<VoiceState>({
    phase: "idle",
    recordingTimeSec: 0,
    canPause: false,
    canResume: false,
    hasRecording: false,
  })
  const [port] = useState<VoicePort>(() => voicePortFactory())
  const [hasRecording, setHasRecording] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
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
    setIsPaused(false)
    startTimer()
    setIsStarting(false)
  }

  async function pause() {
    await port.pause()
    setState((prev) => ({
      ...prev,
      phase: "paused",
    }))
  }

  async function resume() {
    port.resume()
    setIsPaused(false)
    startTimer()
  }

  function stop() {
    port.stop()
    setIsRecording(false)
    setIsPaused(false)
    stopTimer()
  }

  async function discard() {
    port.discard()
    setHasRecording(false)
    setIsRecording(false)
    setIsPaused(false)
    stopTimer()
    setRecordingTime(0)
  }

  return {
    state,
    setState,
    isRecording,
    isPaused,
    isStarting,
    hasRecording,
    recordingTime,
    recordingIntervalRef,
    setIsPaused,
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
