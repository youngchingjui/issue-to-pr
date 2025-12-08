// This is another hook for using voice that's mainly for the input pill component.
// Ideally, we'd combine this with useVoiceDictation into a single hook.
// It injects the VoiceService implementation
// And conducts those services, along with managing the state

import { useMemo, useState } from "react"

import { VoiceService, VoiceState } from "../types/voice"

export function useVoice(service: VoiceService) {
  const [state, setState] = useState<VoiceState>(() => service.getState())

  return useMemo(
    () => ({
      state,
      setState,
      start: () => {
        service.start()
        setState((prev) => ({
          ...prev,
          phase: "recording",
        }))
      },
      pause: () => {
        service.pause()
        setState((prev) => ({
          ...prev,
          phase: "paused",
        }))
      },
      resume: () => {
        service.resume()
        setState((prev) => ({
          ...prev,
          phase: "recording",
        }))
      },
      stop: () => {
        service.stop()
        setState((prev) => ({
          ...prev,
          phase: "idle",
        }))
      },
      discard: () => {
        service.discard()
        setState((prev) => ({
          ...prev,
          phase: "idle",
        }))
      },
    }),
    [service, state]
  )
}
