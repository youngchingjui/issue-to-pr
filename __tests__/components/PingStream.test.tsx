import { act } from "@testing-library/react"

import { PingStream } from "@/components/PingStream"
import { render, screen, waitFor } from "@/test-utils"

// Mock EventSource
class MockEventSource implements EventSource {
  static readonly CONNECTING = 0 as const
  static readonly OPEN = 1 as const
  static readonly CLOSED = 2 as const

  onopen: () => void = () => {}
  onmessage: (event: { data: string }) => void = () => {}
  onerror: () => void = () => {}
  close = jest.fn()
  readyState = 0 as const
  url = ""
  withCredentials = false
  readonly CONNECTING = 0 as const
  readonly OPEN = 1 as const
  readonly CLOSED = 2 as const

  constructor(url: string | URL, _eventSourceInitDict?: EventSourceInit) {
    this.url = url.toString()
    setTimeout(() => {
      act(() => {
        this.onopen()
        this.onmessage({ data: "ping" })
      })
    }, 0)
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return true
  }
}

global.EventSource = MockEventSource

describe("PingStream", () => {
  it("should connect to SSE and display pings", async () => {
    render(<PingStream />)

    // Check initial state
    expect(screen.getByText(/connecting/i)).toBeInTheDocument()

    // Wait for ping to appear
    await waitFor(() => {
      expect(screen.getByText(/ping/i)).toBeInTheDocument()
    })
  })

  it("should handle disconnection gracefully", async () => {
    render(<PingStream />)

    await act(async () => {
      // Simulate a disconnection
      window.dispatchEvent(new Event("offline"))
    })

    await waitFor(() => {
      expect(screen.getByText(/disconnected/i)).toBeInTheDocument()
    })

    await act(async () => {
      // Simulate reconnection
      window.dispatchEvent(new Event("online"))
    })

    await waitFor(() => {
      expect(screen.getByText(/connecting/i)).toBeInTheDocument()
    })
  })
})
