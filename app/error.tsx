"use client"

import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    const report = async () => {
      try {
        const payload = {
          source: "segment-error",
          message: error?.message ?? "Unknown error",
          stack: error?.stack,
          digest: error?.digest,
          url: typeof window !== "undefined" ? window.location.href : undefined,
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : undefined,
          timestamp: new Date().toISOString(),
        }
        await fetch("/api/log-error", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } catch (_err) {
        console.error("Failed to log error", _err)
      }
    }
    report()
  }, [error])

  return (
    <div style={{ padding: 24 }}>
      <h2>Something went wrong</h2>
      <p>Try again or go back.</p>
      <pre style={{ whiteSpace: "pre-wrap", overflowX: "auto" }}>
        {error?.message}
      </pre>
      <button
        onClick={() => reset()}
        style={{
          marginTop: 16,
          padding: "8px 12px",
          border: "1px solid #ccc",
          borderRadius: 6,
          background: "white",
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  )
}
