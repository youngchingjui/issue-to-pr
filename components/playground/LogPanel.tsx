"use client"

import { Copy, Download, X } from "lucide-react"
import { useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"

interface LogPanelProps {
  isOpen: boolean
  onClose: () => void
  command: string
  logs: string
}

export function LogPanel({ isOpen, onClose, command, logs }: LogPanelProps) {
  const logRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  const handleCopy = () => {
    navigator.clipboard.writeText(logs)
  }

  const handleDownload = () => {
    const blob = new Blob([logs], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `logs-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <h3 className="text-sm font-semibold text-foreground">
                Command Output
              </h3>
              <span className="text-xs text-muted-foreground font-mono bg-secondary px-2 py-1 rounded">
                {command}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="py-4">
            <pre
              ref={logRef}
              className="bg-background border border-border rounded-lg p-4 text-xs font-mono text-foreground overflow-auto max-h-80 leading-relaxed"
            >
              {logs}
            </pre>
          </div>
        </div>
      </div>
    </>
  )
}
