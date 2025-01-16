"use client"

import { motion } from "framer-motion"
import { Github } from "lucide-react"
import Link from "next/link"

export default function Hero() {
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
      <Link href="/api/auth/signin">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center px-6 py-3 bg-amber-700 text-amber-50 rounded-md hover:bg-amber-600 transition-colors mx-auto text-lg"
        >
          <Github className="mr-2" size={24} />
          Login with GitHub
        </motion.button>
      </Link>
      <p className="mt-4 text-stone-500">
        to automatically resolve your GitHub issues
      </p>
    </motion.section>
  )
}
