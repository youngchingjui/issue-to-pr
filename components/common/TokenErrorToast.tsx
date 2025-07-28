"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { useToast } from "@/lib/hooks/use-toast"

export default function TokenErrorToast() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (searchParams.get("error") === "invalid-token") {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "Your GitHub token was invalid. Please sign in again.",
      })
      const params = new URLSearchParams(searchParams.toString())
      params.delete("error")
      const newQuery = params.toString()
      router.replace(newQuery ? `${pathname}?${newQuery}` : pathname)
    }
  }, [searchParams, toast, router, pathname])

  return null
}

