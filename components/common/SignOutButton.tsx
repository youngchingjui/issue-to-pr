"use client"

import { LogOut } from "lucide-react"
import { signOut } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { signOutAndRedirect } from "@/lib/actions/auth"

export default function SignOutButton() {
  const handleSignOut = async () => {
    // First update client state
    await signOut({ redirect: false })
    // Then trigger server action
    await signOutAndRedirect()
  }

  return (
    <Button
      onClick={handleSignOut}
      variant="outline"
      size="sm"
      className="flex items-center px-4 py-2"
    >
      <LogOut className="mr-2" size={20} />
      Sign out
    </Button>
  )
}
