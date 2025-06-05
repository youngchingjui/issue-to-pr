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
      className="relative text-center py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 flex flex-col items-center overflow-hidden"
    >
      <motion.div
        animate={{
          background: [
            "radial-gradient(circle, transparent 20%, hsl(var(--background)), transparent 70%), linear-gradient(-100deg, transparent 20%, hsl(var(--background)), transparent 70%)",
          ],
          transition: {
            duration: 3,
          },
        }}
        className="w-screen h-screen absolute inset-0 transition-colors"
      />
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="max-w-5xl mx-auto relative z-10"
      >
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold mb-3 sm:mb-6 md:mb-8 leading-tight">
          <span>Resolve Github Issues</span>{" "}
          <span>
            in <br />
            <span className="italic text-accent relative">
              one click
              <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-accent/0 via-accent to-accent/0"></span>
            </span>
          </span>
        </h1>
        <p className="text-stone-600 text-sm sm:text-base md:text-lg mb-8 sm:mb-10 max-w-3xl mx-auto px-2 sm:px-4 md:px-5 w-full text-center leading-relaxed">
          End-to-end automation for GitHub: parallel, high-quality PRs that surface agent assumptions and rationale. <br className="hidden md:block" />
          No prompts, no waiting—just fully traceable AI-driven code review and implementation, right from your issues and codebase.
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
          <ShineButton className="text-base sm:text-lg px-4 sm:px-5 md:px-6 py-3 bg-accent text-accent-foreground hover:bg-accent/70">
            Install Github App
            <ExternalLink className="ml-2 h-4 w-4 sm:h-5 sm:w-5 inline" />
          </ShineButton>
        </Link>
      </motion.div>
    </motion.section>
  )
}
