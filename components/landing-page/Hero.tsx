import * as motion from "motion/react-client"

import AuthButton from "@/components/landing-page/AuthButton"

export default async function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 flex flex-col items-center overflow-hidden"
    >
      <motion.div
        animate={{
          background: [
            "radial-gradient(circle, transparent 20%, oklch(var(--background)), transparent 70%), linear-gradient(-100deg, transparent 20%, oklch(var(--background)), transparent 70%)",
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
        className="max-w-6xl mx-auto relative z-10 w-full"
      >
        <h1 className="text-left sm:text-center text-5xl sm:text-6xl md:text-7xl font-extrabold mb-4 sm:mb-6 md:mb-8 leading-tight tracking-tight">
          <span>Preview your ideas</span>
        </h1>
        <p className="text-left sm:text-center text-stone-600 text-base sm:text-lg md:text-xl mb-4 sm:mb-6 max-w-3xl mx-auto px-0 sm:px-4 md:px-5 w-full leading-relaxed">
          Automatically generate previews and PRs from every GitHub issue.
        </p>
      </motion.div>

      {/* Visual placeholder under the CTA */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="relative z-0 mt-10 sm:mt-14 md:mt-16 w-full max-w-5xl px-0 sm:px-4"
        aria-hidden
      >
        {/* Speech bubble */}
        <div className="mb-3 sm:mb-4 md:mb-6 max-w-lg text-left mx-0 sm:mx-auto">
          <div className="inline-block bg-white/70 dark:bg-neutral-900/70 backdrop-blur rounded-2xl px-4 py-3 shadow-sm ring-1 ring-black/5">
            <p className="text-sm sm:text-base text-neutral-800 dark:text-neutral-200">
              “Give me a jazzy blue background.”
            </p>
          </div>
        </div>
        {/* Browser window mock */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm bg-white/50 dark:bg-neutral-900/40">
          {/* Window header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-green-400" />
            <div className="ml-3 h-5 flex-1 rounded bg-neutral-200/70 dark:bg-neutral-800/70" />
          </div>
          {/* Window content that responds to the prompt */}
          <div className="min-h-[220px] sm:min-h-[280px] md:min-h-[360px] bg-blue-600/80 flex items-center justify-center">
            <div className="text-white/95 text-xl sm:text-2xl md:text-3xl font-semibold">
              Your Website
            </div>
          </div>
        </div>
      </motion.div>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="mt-20 mb-20 sm:mt-4 flex flex-col items-center relative z-10"
      >
        <div className="relative isolate">
          <AuthButton />
        </div>
      </motion.div>
    </motion.section>
  )
}
