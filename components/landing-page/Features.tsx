import React from "react"
import TextLg from "../ui/text-lg"
import FeatureShowcase from "../ui/feature-showcase"
import { Flame } from "lucide-react"
import Link from "next/link"
import ShineButton from "../ui/shine-button"
import * as motion from "motion/react-client"

const Features = () => {
  return (
    <div className="relative py-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />

      <div className="absolute inset-0 w-full h-full">
        <motion.div
          className="absolute top-20 left-[10%] w-32 h-32 rounded-full bg-green-400/50 backdrop-blur-sm"
          animate={{
            y: [0, -15, 0],
            x: [0, 10, 0],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="absolute bottom-40 right-[15%] w-40 h-40 rounded-full bg-green-400/50 backdrop-blur-sm"
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
          className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full bg-amber-400/60 backdrop-blur-sm"
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
          className="absolute top-1/3 left-1/4 w-16 h-16 rounded-full bg-blue-400/40 backdrop-blur-sm"
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
          className="absolute bottom-20 left-[20%] w-20 h-20 rounded-full bg-amber-400/50 backdrop-blur-sm"
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
            <span className="italic text-green-800 relative">
              issuetopr.dev?
            </span>
          </span>
        </TextLg>
        <FeatureShowcase
          items={[
            {
              image:
                "https://images.unsplash.com/photo-1731770241468-8337b047749f?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",

              title: "Catch Bugs Early",
              description:
                "Spot bugs and errors that might slip through manual reviews.",
            },
            {
              image:
                "https://images.unsplash.com/photo-1728993559783-f657d4177c6b?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",

              title: "Improve Code Quality",
              description:
                "Maintain consistent, high-quality code with AI-driven analysis.",
            },
            {
              image:
                "https://images.unsplash.com/photo-1638392436949-3e584046314a?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",

              title: "Reduce Development Time",
              description: "Slash review times to deploy features faster.",
            },
            {
              image:
                "https://images.unsplash.com/photo-1726880066148-fdc1ceba7343?q=80&w=3876&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
              title: "Reduce Manual Checks",
              description:
                "Free your developers from routine checks to focus on innovation.",
            },
          ]}
        />
        <Link
          href="https://github.com/apps/issuetopr-dev"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-14"
          prefetch={false}
        >
          <ShineButton className="text-base sm:text-lg px-4 sm:px-5 md:px-6 py-3 bg-green-800 text-white hover:bg-green-800/70">
            Get Started Today
            <Flame className="ml-2 h-4 w-4 sm:h-5 sm:w-5 inline" />
          </ShineButton>
        </Link>
      </div>
    </div>
  )
}

export default Features
