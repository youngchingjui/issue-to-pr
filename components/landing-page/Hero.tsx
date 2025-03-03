import * as motion from "motion/react-client"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export default async function Hero() {
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

      <Link
        href="https://github.com/apps/issuetopr-dev"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block"
        prefetch={false}
      >
        <Button
          size="lg"
          className="text-lg p-6 bg-amber-700 text-white hover:bg-amber-600"
        >
          Install Github App
        </Button>
      </Link>
      <p className="text-stone-500 mt-4">
        Connect your repository to begin resolving your GitHub issues.
      </p>
    </motion.section>
  )
}
