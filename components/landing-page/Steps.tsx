"use client"

import { motion } from "framer-motion"
import React, { useState } from "react"
import { twMerge } from "tailwind-merge"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"
import TextLg from "../ui/text-lg"

const steps = [
  {
    title: "Get The App",
    description:
      "Once you enable the app on the GitHub App Store, It activates automatically.",
  },
  {
    title: "Create an Issue or Pull Request",
    description:
      "Issue To PR will automatically generate plans on new issues and reviews of PRs.",
  },
  {
    title: "Resolve Issues",
    description:
      "Resolve Github Issues by signing in to issuetopr.dev, finding the issue to resolve, and select 'Fix Issue and Create PR'.",
  },
]

const Steps = () => {
  const [isHovered, setIsHovered] = useState<number | null>(null)

  return (
    <div
      id="how-to"
      className="relative py-20 flex flex-col items-center justify-center bg-white border-t-2 border-black"
    >
      <TextLg>
        <span>How does it</span>{" "}
        <span>
          <span className="italic text-green-800 relative">work?</span>
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
                <div className="h-2 w-full bg-gradient-to-r from-green-800 to-green-600 rounded-full" />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default Steps
