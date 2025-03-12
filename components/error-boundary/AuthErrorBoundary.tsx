"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { toast } from "@/hooks/use-toast"
import { signOutAndRedirect } from "@/lib/actions/auth"

interface Props {
  children: React.ReactNode
}

export default function AuthErrorBoundary({ children }: Props) {
  const router = useRouter()

  useEffect(() => {
    // Listen for unhandled errors
    const handleError = async (event: ErrorEvent) => {
      const error = event.error

      // Check if it's an authentication error
      if (
        error?.message?.includes("Bad credentials") ||
        error?.message?.includes("Authentication failed") ||
        error?.message?.includes("Token expired") ||
        error?.message?.includes("Bad refresh token") ||
        error?.status === 401
      ) {
        // Prevent the error from propagating
        event.preventDefault()

        // Show toast notification
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please sign in again.",
          variant: "destructive",
        })

        // Sign out and redirect
        await signOutAndRedirect()
      }
    }

    // Create a global function for components to explicitly handle auth errors
    window.handleAuthError = async (
      errorCode?: string,
      errorMessage?: string
    ) => {
      toast({
        title: "Authentication Error",
        description:
          errorMessage || "Your session has expired. Please sign in again.",
        variant: "destructive",
      })

      await signOutAndRedirect()
    }

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", (event) =>
      handleError(event as unknown as ErrorEvent)
    )

    return () => {
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", (event) =>
        handleError(event as unknown as ErrorEvent)
      )
      delete window.handleAuthError
    }
  }, [router])

  return <>{children}</>
}

// Add the global function type to the Window interface
declare global {
  interface Window {
    handleAuthError: (
      errorCode?: string,
      errorMessage?: string
    ) => Promise<void>
  }
}
