"use client"

import React, { useState } from "react"
import TextLg from "../ui/text-lg"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"
import Image from "next/image"
import { motion } from "framer-motion"
import { twMerge } from "tailwind-merge"

const steps = [
  {
    image:
      "https://images.unsplash.com/photo-1731770241468-8337b047749f?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    title: "Get The App",
    description:
      "Once you enable the app on the GitHub App Store, It activates automatically.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1728993559783-f657d4177c6b?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    title: "Make a Pull Request",
    description:
      "Issuetopr.dev will run automatically on all your pull requests.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1638392436949-3e584046314a?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    title: "Report",
    description:
      "The multi AI Agent workflow will provide detailed report directly in PR comments.",
  },
]

const Steps = () => {
  const [isHovered, setIsHovered] = useState<number | null>(null)

  return (
    <div className="relative py-20 flex flex-col items-center justify-center bg-white border-t-2 border-black">
      <TextLg>
        <span className="block sm:inline">How it</span>{" "}
        <span className="block sm:inline">
          <span className="italic text-green-800 relative">works?</span>
        </span>
      </TextLg>

      <div className="grid grid-cols-1 md:grid-cols-3 mt-10 max-w-7xl gap-4 mx-auto px-4">
        {steps.map((step, index) => (
          <motion.div
            initial={{
              background: "transparent",
              backgroundSize: "200% 200%",
            }}
            whileHover={{
              background:
                "conic-gradient(from 45deg, #15803dDD, #22c55eDD, #86efacDD, #fbbf24DD, #f97316DD, #22c55eDD, #15803dDD)",
              backgroundSize: "200% 200%",
              transition: {
                duration: 0.5,
                ease: "easeInOut",
                background: {
                  type: "tween",
                  duration: 2,
                },
              },
            }}
            key={index}
            className="flex flex-col p-2 rounded-2xl"
          >
            <Card
              onMouseEnter={() => setIsHovered(index)}
              onMouseLeave={() => setIsHovered(null)}
              className={twMerge(
                `flex-1 overflow-hidden bg-white/90 transition-all duration-300`,
                isHovered === index && "bg-white",
                isHovered !== null && isHovered !== index && "blur-sm"
              )}
            >
              <CardHeader className="pb-0">
                <CardTitle className="text-2xl font-bold">
                  {step.title}
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  {step.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 pb-6">
                <div className="relative h-64 w-full overflow-hidden rounded-lg">
                  <Image
                    src={step.image}
                    alt={step.title}
                    fill
                    className="object-cover"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default Steps
