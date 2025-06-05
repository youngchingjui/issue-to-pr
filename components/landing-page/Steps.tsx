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
    title: "Create a GitHub Issue (or PR)",
    description:
      "Begin by opening a new issue or pull request. Issue To PR activates instantly.",
  },
  {
    title: "System Auto-Generates a Plan",
    description:
      "For each issue, agents analyze the codebase and generate a detailed, traceable plan—including a list of all explicit and implicit assumptions.",
  },
  {
    title: "Agent Implements Code, Tests, Lint",
    description:
      "AI agents handle code changes and new or updated tests, while auto-fixing lints (tests/lint fix is rapidly improving—full automation coming soon).",
  },
  {
    title: "Pull Request Is Created With Full Metadata",
    description:
      "A high-quality PR is opened: it includes the rationale, linked issue, evidence, and clear explanations for each change.",
  },
  {
    title: "Review & Iterate—With Seamless Updates Via Comments",
    description:
      "You can review, approve, or suggest changes to the plan or PR—just comment on the PR or issue using @issue-to-pr—no separate UI. The agents update accordingly.",
  },
  {
    title: "Trace Every Agent Decision Or Action",
    description:
      "Each step and change is fully traceable: see agent rationale, context, and evidence at every turn.",
  },
  {
    title: "Handle Multiple Issues in Parallel",
    description:
      "No backlog bottlenecks: the system processes many issues or PRs at once, not one-by-one. Accelerate your entire backlog—remove blockers and context switches.",
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
          <span className="italic text-accent relative">work?</span>
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
                <div className="h-2 w-full bg-gradient-to-r from-accent to-accent/70 rounded-full" />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default Steps
