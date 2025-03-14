import { useEffect, useState } from "react"

export const PingStream = () => {
  const [status, setStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting")
  const [lastPing, setLastPing] = useState<string | null>(null)

  useEffect(() => {
    const eventSource = new EventSource("/api/stream/ping")

    eventSource.onopen = () => {
      setStatus("connected")
    }

    eventSource.onmessage = (event) => {
      setLastPing(event.data)
    }

    eventSource.onerror = () => {
      setStatus("disconnected")
      eventSource.close()
    }

    const handleOnline = () => {
      setStatus("connecting")
      // EventSource will automatically try to reconnect
    }

    const handleOffline = () => {
      setStatus("disconnected")
      eventSource.close()
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      eventSource.close()
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return (
    <div>
      <div>Status: {status}</div>
      {lastPing && <div>Last ping: {lastPing}</div>}
    </div>
  )
}
