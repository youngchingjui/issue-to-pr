"use client"

import * as motion from "motion/react-client"

import { signOut } from "@/lib/actions"

export default function SignOutButton() {
  return (
    <motion.button
      type="button"
      onClick={() => signOut()}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex items-center px-4 py-2 bg-stone-700 text-stone-100 rounded-md hover:bg-stone-600 transition-colors"
    >
      Logout
    </motion.button>
  )
}
