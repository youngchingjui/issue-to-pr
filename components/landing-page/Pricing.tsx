"use client"

import React from "react"
import TextLg from "../ui/text-lg"
import { Card, CardContent, CardHeader } from "../ui/card"
import { Check, Flame } from "lucide-react"
import Link from "next/link"
import ShineButton from "../ui/shine-button"
import TextMd from "../ui/text-md"
import TextSm from "../ui/text-sm"
import { motion } from "framer-motion"
import MovingBorderCard from "../ui/moving-border-card"
const Pricing = () => {
  const features = [
    "Detection of potential runtime bugs",
    "Identification of operations that could slow system performance",
    "Assessment of code modularity and maintainability",
    "Checks for uncovered edge cases",
    "Evaluation of variable names with improvement suggestions",
    "Identification of related files needing updates",
    "Reminders to update or create unit tests",
    "Suggestions for documentation enhancements",
  ]

  return (
    <div
      style={{
        background:
          "radial-gradient(circle at center, #C2FF8455 0%, #efefef44 80%)",
      }}
      className="relative py-20 flex flex-col items-center justify-center backdrop-blur-sm"
    >
      <TextLg>
        <span className="block sm:inline">One Simple Plan,</span>{" "}
        <span className="block sm:inline">
          <span className="italic text-green-800 relative">
            Unlimited Value
          </span>
        </span>
      </TextLg>

      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        whileInView={{
          opacity: 1,
          y: 0,
        }}
        viewport={{
          once: true,
        }}
        transition={{
          duration: 0.5,
          ease: "easeOut",
          delay: 0.2,
        }}
        className="w-full max-w-[300px] sm:max-w-sm md:max-w-md"
      >
        <MovingBorderCard wrapperClassName="mt-10 rounded-3xl">
          <Card className="shadow-none rounded-3xl overflow-hidden bg-white">
            <CardHeader className="py-2 pb-0 text-center border-b border-gray-200 bg-black/90">
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-2 py-4 text-green-700">
                $1/<span className="italic">Month</span>
              </h2>
            </CardHeader>
            <div className="w-full flex items-center justify-center mt-5">
              <Link
                href="https://buy.stripe.com/dR603Q1Zy6YL7bq007"
                target="_blank"
                className="w-full px-4 sm:px-6"
              >
                <ShineButton className="text-base w-full sm:text-lg py-3 bg-green-800 text-white hover:bg-green-800/70">
                  Subscribe
                  <Flame className="ml-2 h-4 w-4 sm:h-5 sm:w-5 inline" />
                </ShineButton>
              </Link>
            </div>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col items-start justify-start">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    style={{
                      gridTemplateColumns: "16px 1fr",
                    }}
                    className="grid grid-cols-2 gap-2"
                  >
                    <Check
                      size={16}
                      strokeWidth={3}
                      className="mt-1.5 text-green-700"
                    />
                    <p className="text-sm sm:text-lg">{feature}.</p>
                  </div>
                ))}
                <div className="mt-2 text-sm sm:text-lg w-full text-center">
                  and more!
                </div>
              </div>
            </CardContent>
          </Card>
        </MovingBorderCard>
      </motion.div>
      <TextMd className="mt-10 max-w-lg text-center">
        Price goes up with every sale—snag the best deal before it's gone!
      </TextMd>
      <TextSm className="mt-2 text-black/50">
        The price resets if no sales in 72 hours.
      </TextSm>
    </div>
  )
}

export default Pricing
