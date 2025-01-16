import { Github } from "lucide-react"
import * as motion from "motion/react-client"
import Link from "next/link"

import { auth } from "@/auth"

export default async function Hero() {
  const session = await auth()
  // TODO: Find the user's Github username

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="text-center py-20 px-4 bg-white bg-opacity-30 backdrop-blur-sm"
    >
      <h1 className="text-4xl md:text-5xl font-bold mb-6 text-stone-700">
        Automatically Resolve Your GitHub Issues and Create Pull Requests
      </h1>
      <p className="text-xl mb-8 text-stone-600">
        Let AI handle your issues while you focus on what matters most.
      </p>
      <Link href={session ? `/${session.user.name}` : "/api/auth/signin"}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center px-6 py-3 bg-amber-700 text-amber-50 rounded-md hover:bg-amber-600 transition-colors mx-auto text-lg"
        >
          <Github className="mr-2" size={24} />
          {session ? "View my repositories" : "Login with GitHub"}
        </motion.button>
      </Link>
      <p className="mt-4 text-stone-500">
        to automatically resolve your GitHub issues
      </p>
    </motion.section>
  )
}
