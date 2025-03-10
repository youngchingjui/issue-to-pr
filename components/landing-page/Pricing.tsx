"use client"

import { motion } from "framer-motion"
import { Check, ShoppingCart } from "lucide-react"
import Link from "next/link"
import React from "react"

import { Card, CardContent, CardHeader } from "../ui/card"
import MovingBorderCard from "../ui/moving-border-card"
import ShineButton from "../ui/shine-button"
import TextLg from "../ui/text-lg"
import TextMd from "../ui/text-md"
import TextSm from "../ui/text-sm"

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
    <motion.div
      id="pricing"
      animate={{
        background: [
          "linear-gradient(90deg, transparent 45%, rgba(255,255,255,1), transparent 55%), linear-gradient(0deg, transparent 45%, rgba(255,255,255,1), transparent 55%)",
          "linear-gradient(180deg, transparent 45%, rgba(255,255,255,1), transparent 55%), linear-gradient(90deg, transparent 45%, rgba(255,255,255,1), transparent 55%)",
          "linear-gradient(270deg, transparent 45%, rgba(255,255,255,1), transparent 55%), linear-gradient(180deg, transparent 45%, rgba(255,255,255,1), transparent 55%)",
          "linear-gradient(360deg, transparent 45%, rgba(255,255,255,1), transparent 55%), linear-gradient(270deg, transparent 45%, rgba(255,255,255,1), transparent 55%)",
          "linear-gradient(450deg, transparent 45%, rgba(255,255,255,1), transparent 55%), linear-gradient(360deg, transparent 45%, rgba(255,255,255,1), transparent 55%)",
        ],
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        repeatType: "loop",
        ease: "linear",
      }}
      className="relative py-16 flex flex-col items-center justify-center overflow-hidden border-y-2 border-black"
    >
      {/* Heading with animation */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative z-10 text-center mb-12"
      >
        <TextLg className="max-w-2xl">
          <span className="block sm:inline">One Simple Plan,</span>{" "}
          <span className="block sm:inline">
            <span className="italic text-green-800 relative">
              Unlimited Value
              <motion.span
                className="absolute -bottom-2 left-0 w-full h-1 bg-green-600/40"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </span>
          </span>
        </TextLg>
      </motion.div>

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
          duration: 0.7,
          ease: "easeOut",
          delay: 0.3,
        }}
        className="w-full max-w-[340px] sm:max-w-sm md:max-w-md relative z-10"
      >
        <MovingBorderCard wrapperClassName="mt-6 rounded-3xl">
          <Card className="shadow-xl rounded-3xl overflow-hidden bg-white/95 backdrop-blur-sm border border-green-100">
            <CardHeader className="py-6 pb-4 text-center bg-gradient-to-r from-green-900 to-green-700 relative overflow-hidden">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 py-2 text-white">
                $1/<span className="italic font-light">Month</span>
              </h2>
            </CardHeader>
            <div className="w-full flex items-center justify-center mt-6 px-6">
              <Link
                href="https://buy.stripe.com/dR603Q1Zy6YL7bq007"
                target="_blank"
                className="w-full"
              >
                <ShineButton className="text-base w-full sm:text-lg py-3.5 bg-gradient-to-r from-green-800 to-green-700 text-white hover:from-green-700 hover:to-green-600 border-none font-medium">
                  Subscribe Now
                  <ShoppingCart className="ml-2 h-4 w-4 sm:h-5 sm:w-5 inline" />
                </ShineButton>
              </Link>
            </div>
            <CardContent className="p-6 sm:p-8">
              <p className="text-gray-600 mb-4 text-center">
                Everything you need to improve your code quality:
              </p>
              <div className="flex flex-col items-start justify-start space-y-3">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index, duration: 0.3 }}
                    className="flex items-start"
                  >
                    <div className="min-w-[24px] h-6 flex items-center justify-center bg-green-100 rounded-full mr-3">
                      <Check
                        size={14}
                        strokeWidth={3}
                        className="text-green-700"
                      />
                    </div>
                    <p className="text-sm sm:text-base text-gray-700">
                      {feature}
                    </p>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2, duration: 0.5 }}
                  className="w-full text-center mt-2 pt-2 border-t border-gray-100"
                >
                  <p className="text-sm sm:text-base font-medium text-green-800">
                    And many more features!
                  </p>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </MovingBorderCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.7 }}
        className="relative z-10 mt-12"
      >
        <TextMd className="max-w-lg text-center font-medium">
          Price goes up with every sale—snag the best deal before it&apos;s
          gone!
        </TextMd>
        <div className="flex items-center justify-center mt-3">
          <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm">
            <TextSm className="text-gray-600">
              The price resets if no sales in 72 hours.
            </TextSm>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default Pricing
