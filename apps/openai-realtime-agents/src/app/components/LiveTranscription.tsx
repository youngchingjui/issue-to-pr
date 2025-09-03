"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useTranscript } from "@/app/contexts/TranscriptContext";

export interface LiveTranscriptionProps {
  isExpanded: boolean;
}

function LiveTranscription({ isExpanded }: LiveTranscriptionProps) {
  const { transcriptItems } = useTranscript();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const liveItems = useMemo(
    () =>
      transcriptItems
        .filter(
          (t) =>
            t.type === "MESSAGE" &&
            t.status === "IN_PROGRESS" &&
            !t.isHidden &&
            (t.title ?? "").trim().length > 0,
        )
        .sort((a, b) => a.createdAtMs - b.createdAtMs),
    [transcriptItems],
  );

  useEffect(() => {
    if (isExpanded && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [isExpanded, liveItems]);

  return (
    <div
      className={
        (isExpanded ? "w-1/3 overflow-auto" : "w-0 overflow-hidden opacity-0") +
        " transition-all rounded-xl duration-200 ease-in-out flex flex-col bg-white"
      }
      ref={containerRef}
    >
      {isExpanded && (
        <div className="flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between px-6 py-3.5 sticky top-0 z-10 text-base border-b bg-white rounded-t-xl">
            <span className="font-semibold">Live Transcription</span>
          </div>

          <div className="p-4 flex flex-col gap-y-3">
            {liveItems.length === 0 && (
              <div className="text-sm text-gray-500 italic">
                Waiting for speech...
              </div>
            )}
            {liveItems.map((item) => (
              <div key={item.itemId} className="flex flex-col">
                <div className="text-xs text-gray-500 font-mono mb-1">
                  {item.timestamp} · {item.role === "user" ? "User" : "Assistant"}
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-2 whitespace-pre-wrap">
                  {item.title}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveTranscription;

