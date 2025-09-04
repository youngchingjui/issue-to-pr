import { ExternalLink } from "lucide-react"
import React from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Props {
  previewUrl?: string | null
}

export default function PreviewDeploymentIndicator({ previewUrl }: Props) {
  if (!previewUrl) return (
    <div style={{ width: 24, display: "flex", justifyContent: "center" }} />
  )

  return (
    <TooltipProvider delayDuration={200}>
      <div style={{ width: 24, display: "flex", justifyContent: "center" }}>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer"
            >
              <ExternalLink className="inline align-text-bottom text-amber-600" size={18} />
            </a>
          </TooltipTrigger>
          <TooltipContent side="bottom">Preview</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

