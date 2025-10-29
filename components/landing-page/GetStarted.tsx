"use client"

import { motion } from "framer-motion"

import AuthButton from "@/components/landing-page/AuthButton"
import TextLg from "@/components/ui/text-lg"

export default function GetStarted() {
  return (
    <section className="text-center flex flex-col items-center w-full mx-auto">
      <div className="w-full max-w-full mx-auto pb-16 px-4 relative flex flex-col items-center overflow-hidden shadow-lg py-16">
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            background:
              "linear-gradient(to bottom, oklch(var(--background)), oklch(var(--card)))",
            clipPath: "polygon(0 50%, 100% 35%, 100% 100%, 0 100%)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-xl backdrop-blur-xl bg-white/70 relative z-10 p-10 border border-gray-100 shadow-sm flex flex-col items-center gap-6"
        >
          <TextLg className="text-center ">Ready to get started?</TextLg>
          <div className="relative isolate">
            <AuthButton />
          </div>
        </motion.div>
      </div>
    </section>
  )
}

