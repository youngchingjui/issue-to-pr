import { Flame } from "lucide-react"
import * as motion from "motion/react-client"
import Link from "next/link"
import React from "react"

import ShineButton from "../ui/shine-button"
import TextLg from "../ui/text-lg"

const Features = () => {
  return (
    <div className="relative py-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />

      <div className="absolute inset-0 w-full h-full">
        <motion.div
          className="absolute top-20 left-[10%] w-32 h-32 rounded-full bg-accent/50 backdrop-blur-sm"
          animate={{
            y: [0, -15, 0],
            x: [0, 10, 0],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="absolute bottom-40 right-[15%] w-40 h-40 rounded-full bg-accent/50 backdrop-blur-sm"
          animate={{
            y: [0, 20, 0],
            x: [0, -15, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />

        <motion.div
          className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full bg-secondary/60 backdrop-blur-sm"
          animate={{
            y: [0, 10, 0],
            x: [0, -10, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />

        <motion.div
          className="absolute top-1/3 left-1/4 w-16 h-16 rounded-full bg-muted/40 backdrop-blur-sm"
          animate={{
            y: [0, 12, 0],
            x: [0, 8, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />

        <motion.div
          className="absolute bottom-20 left-[20%] w-20 h-20 rounded-full bg-secondary/50 backdrop-blur-sm"
          animate={{
            y: [0, -10, 0],
            x: [0, 5, 0],
          }}
          transition={{
            duration: 6.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5,
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col gap-10 items-center justify-center px-4">
        <TextLg>
          <span className="block sm:inline">Why choose</span>{" "}
          <span className="block sm:inline">
            <span className="italic text-accent relative">Issue To PR?</span>
          </span>
        </TextLg>
        <div className="flex flex-col max-w-[1300px] w-full gap-12 px-5 lg:px-10">
          {[
            {
              title: "Zero Prompt Engineering",
              description:
                "Say goodbye to writing AI prompts. All the necessary context is already in your GitHub issues, codebase, and online resources - we'll handle the rest.",
            },
            {
              title: "Built for Complex Codebases",
              description:
                "Unlike tools that build from scratch, Issue To PR excels at improving existing, complex codebases - making it perfect for established projects.",
            },
            {
              title: "Catch Bugs Early",
              description:
                "Spot bugs and errors that might slip through manual reviews.",
            },
            {
              title: "Improve Code Quality",
              description:
                "Maintain consistent, high-quality code with AI-driven analysis.",
            },
            {
              title: "Reduce Development Time",
              description: "Slash review times to deploy features faster.",
            },
            {
              title: "Reduce Manual Checks",
              description:
                "Free your developers from routine checks to focus on innovation.",
            },
          ].map((item, i) => {
            return (
              <motion.div
                initial={{
                  opacity: 0,
                }}
                whileInView={{
                  opacity: 1,
                  transition: {
                    duration: 0.6,
                    ease: "easeOut",
                    delay: 0.2,
                  },
                }}
                viewport={{ once: true }}
                key={`feature-item-${i}`}
                className="w-full bg-gradient-to-br from-white/5 to-transparent p-6 rounded-xl border-2 border-black/10 hover:border-black/20 transition-all duration-300"
              >
                <div className="flex flex-col gap-4">
                  <h3 className="text-2xl font-bold text-accent">
                    {item.title}
                  </h3>
                  <p className="text-lg text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
        <Link
          href="https://github.com/apps/issuetopr-dev"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-14"
          prefetch={false}
        >
          <ShineButton className="text-base sm:text-lg px-4 sm:px-5 md:px-6 py-3 bg-accent text-accent-foreground hover:bg-accent/70">
            Get Started Today
            <Flame className="ml-2 h-4 w-4 sm:h-5 sm:w-5 inline" />
          </ShineButton>
        </Link>
      </div>
    </div>
  )
}

export default Features
