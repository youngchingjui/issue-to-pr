"use client"

import * as motion from "motion/react-client"
import Image from "next/image"

export default function Screenshot() {
  return (
    <section className="py-20 px-4 bg-stone-100 bg-opacity-50">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Image
            src="/placeholder.svg"
            alt="Application Interface"
            width={1200}
            height={675}
            className="rounded-lg shadow-lg"
          />
        </motion.div>
      </div>
    </section>
  )
}
