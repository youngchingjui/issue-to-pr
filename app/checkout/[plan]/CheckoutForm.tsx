"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { signInWithGithub } from "@/lib/actions/auth"

interface CheckoutFormProps {
  plan: string
  isAuthenticated: boolean
  amount: number
  interval: string
}

export default function CheckoutForm({
  plan,
  isAuthenticated,
  amount,
  interval,
}: CheckoutFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleGitHubLogin = async () => {
    setLoading(true)
    try {
      await signInWithGithub()
    } catch (error) {
      console.error("Error signing in with GitHub:", error)
      setLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)

    try {
      // Create a Checkout Session
      const response = await fetch("/api/checkout_sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan,
          amount,
          interval,
        }),
      })

      if (!response.ok) {
        throw new Error("Network response was not ok")
      }

      const data = await response.json()

      // Redirect to Stripe Checkout
      router.push(data.url)
    } catch (error) {
      console.error("Error:", error)
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Please sign in with GitHub to continue with your purchase.
        </p>
        <button
          onClick={handleGitHubLogin}
          disabled={loading}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          {loading ? "Signing in..." : "Sign in with GitHub"}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-md border border-gray-200 p-4 bg-gray-50">
        <p className="text-sm text-gray-600">
          You will be redirected to Stripe to complete your purchase securely.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
      >
        {loading ? "Processing..." : "Proceed to Payment"}
      </button>
    </form>
  )
}
