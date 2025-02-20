"use client"

import { Session } from "next-auth"
import { SessionProvider as Provider, useSession } from "next-auth/react"
import { useEffect } from "react"
import { signIn } from "next-auth/react"







type Props = {
  children: React.ReactNode
  session: Session
}

export default function SessionProvider({ children, session }: Props) {
  // Use session hook to monitor session status
  const { data: sessionData, status } = useSession()

  useEffect(() => {
    // Check if the session exists and its status is authenticated
    if (sessionData && status === 'authenticated') {
      // Monitor token validity
      const isTokenValid = (token: string) => {
        // Implement your token validation logic here (e.g., check expiry)
        // For demonstration, assume a placeholder function that returns a boolean
        return true; // Placeholder
      }

      const refreshSession = async () => {
        // Automatically refresh session here
        await signIn('credentials')
      }

      // If the token is invalid or expired
      if (!isTokenValid(sessionData.accessToken)) {
        // Attempt to refresh the token
        refreshSession().catch(() => {
          // If unable to refresh, notify user or handle accordingly
          alert('Your session has expired. Please log in again.')
          // Optionally redirect to the login page
        })
      }
    }
  }, [sessionData, status])

  return <Provider session={session}>{children}</Provider>
}
