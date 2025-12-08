// This is another hook for using voice that's mainly for the input pill component.
// Ideally, we'd combine this with useVoiceDictation into a single hook.

import { useMemo, useState } from "react"

import { VoiceService, VoiceState } from "../types/voice"

export function useVoice(service: VoiceService) {
  const [state, setState] = useState<VoiceState>(() => service.getState())

  return useMemo(
    () => ({
      state,
      setState,
      start: () => service.start(),
      pause: () => service.pause(),
      resume: () => service.resume(),
      stop: () => service.stop(),
      discard: () => service.discard(),
    }),
    [service, state]
  )
}
