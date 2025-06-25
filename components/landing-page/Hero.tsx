import * as motion from "motion/react-client"

import AuthButton from "@/components/landing-page/AuthButton"

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
          <span>Update your code with natural language</span>
        </h1>
        <p className="text-stone-600 text-sm sm:text-base md:text-lg mb-2 sm:mb-3 max-w-3xl mx-auto px-2 sm:px-4 md:px-5 w-full text-center leading-relaxed">
          Issue To PR&#39;s background AI agents review your codebase, develop
          an implementation plan, and create Pull Requests.
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-8 flex flex-col items-center"
      >
        <div className="relative isolate">
          <AuthButton />
        </div>
      </motion.div>
    </motion.section>
  )
}
