"use client"

import { motion } from "framer-motion"
import { Flame } from "lucide-react"
import Link from "next/link"

import ShineButton from "../ui/shine-button"
import TextLg from "../ui/text-lg"
import TextSm from "../ui/text-sm"

export default function GetStarted() {
  return (
    <section className="text-center flex flex-col items-center w-full mx-auto">
      <div className="w-full max-w-full mx-auto pb-16 px-4 relative flex flex-col items-center overflow-hidden shadow-lg py-16">
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            background:
              "linear-gradient(to bottom, hsl(var(--background)), hsl(var(--card)))",
            clipPath: "polygon(0 50%, 100% 35%, 100% 100%, 0 100%)",
          }}
        />

        <motion.div
          animate={{
            y: [-10, 0, -10],
            x: [5, 0, 5],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-0 right-[10%] w-32 h-32 rounded-full bg-accent/40 backdrop-blur-sm"
        />

        <motion.div
          animate={{
            y: [-10, 0, -10],
            x: [5, 0, 5],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-[20%] left-[15%] w-24 h-24 rounded-full bg-amber-400/40 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-xl backdrop-blur-xl bg-white/70 relative z-10 p-10 border border-gray-100 shadow-sm"
        >
          <TextLg className="text-center ">
            Get <span className="text-center italic text-accent">started!</span>
          </TextLg>
          <div className="max-w-xl">
            <TextSm>
              Install the Issue to PR GitHub App onto your repository.
            </TextSm>
            <TextSm>
              Done! Issue To PR will now automatically review newly-created Pull
              Requests with a follow-on comment.
            </TextSm>
          </div>
          <Link
            href="https://github.com/apps/issuetopr-dev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-10 max-w-lg w-full"
            prefetch={false}
          >
            <ShineButton className="text-base sm:text-lg px-4 sm:px-5 md:px-6 py-3 bg-accent text-accent-foreground hover:bg-accent/70 w-[300px]">
              Download
              <Flame className="ml-2 h-4 w-4 sm:h-5 sm:w-5 inline" />
            </ShineButton>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
