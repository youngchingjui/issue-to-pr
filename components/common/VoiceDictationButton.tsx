"use client"

import { Loader2, Mic, RotateCcw } from "lucide-react"

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
  const {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    retryTranscription,
    lastError,
    audioUrl,
  } = useVoiceDictation({ onTranscribed })

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <Button
        type="button"
        variant="secondary"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isTranscribing}
        className={`${isRecording ? "animate-pulse" : ""}`}
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

      {!isRecording && !isTranscribing && lastError && audioUrl ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={retryTranscription}
          >
            <RotateCcw className="h-4 w-4" /> Retry transcribe
          </Button>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls src={audioUrl} className="h-9" />
        </>
      ) : null}
    </div>
  )
}
