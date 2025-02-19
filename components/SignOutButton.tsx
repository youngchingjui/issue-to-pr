"use client"

import * as motion from "motion/react-client"

import { signOut } from "@/auth"

export default function SignOutButton() {
  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <form action={handleSignOut}>
      <motion.button
        type="submit"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center px-4 py-2 bg-stone-700 text-stone-100 rounded-md hover:bg-stone-600 transition-colors"
      >
        Logout
      </motion.button>
    </form>
  )
}
