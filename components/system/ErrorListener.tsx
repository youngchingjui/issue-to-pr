"use client"

/*
 Global client-side error listener that reports errors to the server for telemetry.
 Only sends in production to avoid noisy local development logs.
*/

import { useEffect } from "react"

function postError(payload: unknown) {
  try {
    void fetch("/api/telemetry/error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true, // allow sending during page unload
    })
  } catch {
    // do nothing - best effort
  }
}

export default function ErrorListener() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return

    const onError = (event: ErrorEvent) => {
      postError({
        message: event.message,
        stack: event.error?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        source: "window.onerror",
        meta: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      })
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      let message = "Unhandled promise rejection"
      let stack: string | undefined
      if (reason instanceof Error) {
        message = reason.message
        stack = reason.stack
      } else if (typeof reason === "string") {
        message = reason
      }
      postError({
        message,
        stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        source: "window.unhandledrejection",
      })
    }

    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onUnhandledRejection)

    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onUnhandledRejection)
    }
  }, [])

  return null
}

