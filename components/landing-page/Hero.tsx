import { ExternalLink } from "lucide-react"
import * as motion from "motion/react-client"
import Link from "next/link"

import ShineButton from "@/components/ui/shine-button"

export default async function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="text-center py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 bg-white bg-opacity-30 backdrop-blur-sm flex flex-col items-center"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="max-w-5xl mx-auto"
      >
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold mb-3 sm:mb-4 md:mb-5 leading-tight">
          <span className="block sm:inline">Automate Pull Requests</span>{" "}
          <span className="block sm:inline">
            with{" "}
            <span className="italic text-green-800">AI Powered Insights</span>
          </span>
        </h1>
        <p className="text-stone-600 text-sm sm:text-base md:text-lg mb-8 sm:mb-10 max-w-3xl mx-auto px-2 sm:px-4 md:px-5 w-full text-center leading-relaxed">
          Streamline your development process with issuetopr.dev, a GitHub App
          that uses advanced multi-agent AI workflows to automatically resolve
          issues and create Pull Requests.
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Link
          href="https://github.com/apps/issuetopr-dev"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block"
          prefetch={false}
        >
          <ShineButton className="text-base sm:text-lg px-4 sm:px-5 md:px-6 py-3 bg-green-800 text-white hover:bg-green-800/70">
            Install Github App
            <ExternalLink className="ml-2 h-4 w-4 sm:h-5 sm:w-5 inline" />
          </ShineButton>
        </Link>
      </motion.div>
    </motion.section>
  )
}
