"use client"

import { Loader2, Mic } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useVoiceDictation } from "@/lib/hooks/useVoiceDictation"

type Props = {
  onTranscribed?: (text: string) => void
  disabled?: boolean
  className?: string
}

export default function VoiceDictationButton({
  onTranscribed,
  disabled,
  className,
}: Props) {
  const { isRecording, isTranscribing, startRecording, stopRecording } =
    useVoiceDictation({ onTranscribed })

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled || isTranscribing}
      className={`${isRecording ? "animate-pulse" : ""} ${className || ""}`}
      size={isRecording ? undefined : "icon"}
    >
      {isTranscribing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isRecording ? (
        <>
          <Mic className="mr-2 h-4 w-4" /> Listening...
        </>
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  )
}
