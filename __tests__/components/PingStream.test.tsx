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
  private static instances: MockEventSource[] = []

  constructor(url: string | URL, _eventSourceInitDict?: EventSourceInit) {
    this.url = url.toString()
    MockEventSource.instances.push(this)
    setTimeout(() => {
      act(() => {
        this.onopen()
        this.onmessage({ data: "ping" })
      })
    }, 0)
  }

  static getInstance(): MockEventSource | undefined {
    return MockEventSource.instances[MockEventSource.instances.length - 1]
  }

  static clearInstances() {
    MockEventSource.instances = []
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return true
  }
}

// Replace global EventSource with our mock
global.EventSource = MockEventSource

describe("PingStream", () => {
  beforeEach(() => {
    MockEventSource.clearInstances()
  })

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

  it("should handle connection errors", async () => {
    render(<PingStream />)

    // Wait for initial connection
    await waitFor(() => {
      expect(screen.getByText(/connected/i)).toBeInTheDocument()
    })

    await act(async () => {
      // Get the EventSource instance and trigger error
      const eventSource = MockEventSource.getInstance()
      if (eventSource) {
        eventSource.onerror()
      }
    })

    // Verify disconnected state
    await waitFor(() => {
      expect(screen.getByText(/disconnected/i)).toBeInTheDocument()
    })
  })

  it("should cleanup EventSource on unmount", async () => {
    const { unmount } = render(<PingStream />)

    // Wait for connection
    await waitFor(() => {
      expect(screen.getByText(/ping/i)).toBeInTheDocument()
    })

    // Get the EventSource instance before unmounting
    const eventSource = MockEventSource.getInstance()
    expect(eventSource).toBeDefined()

    // Unmount and verify close was called
    unmount()
    expect(eventSource?.close).toHaveBeenCalled()
  })

  it("should handle multiple pings", async () => {
    render(<PingStream />)

    // Wait for first ping
    await waitFor(() => {
      expect(screen.getByText(/ping/i)).toBeInTheDocument()
    })

    // Simulate second ping
    await act(async () => {
      const eventSource = MockEventSource.getInstance()
      if (eventSource) {
        eventSource.onmessage({ data: "ping" })
      }
    })

    // Verify ping is still displayed (no errors from multiple pings)
    expect(screen.getByText(/ping/i)).toBeInTheDocument()
  })

  it("should not attempt reconnection when unmounted", async () => {
    const { unmount } = render(<PingStream />)

    // Wait for connection
    await waitFor(() => {
      expect(screen.getByText(/ping/i)).toBeInTheDocument()
    })

    // Get the EventSource instance before unmounting
    const eventSource = MockEventSource.getInstance()
    expect(eventSource).toBeDefined()

    // Unmount component
    unmount()

    // Simulate online event
    await act(async () => {
      window.dispatchEvent(new Event("online"))
    })

    // Verify close was called exactly once
    expect(eventSource?.close).toHaveBeenCalledTimes(1)
  })
})
