"use client"

import { motion } from "framer-motion"
import { Check, HelpCircle, ShoppingCart } from "lucide-react"
import Link from "next/link"
import React from "react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import MovingBorderCard from "@/components/ui/moving-border-card"
import ShineButton from "@/components/ui/shine-button"
import TextLg from "@/components/ui/text-lg"
import TextMd from "@/components/ui/text-md"
import TextSm from "@/components/ui/text-sm"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
            <span className="italic text-accent relative">
              Unlimited Value
              <span className="absolute -bottom-2 left-0 w-full h-1 bg-accent/40" />
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
          <Card className="shadow-xl rounded-3xl overflow-hidden bg-white/95 backdrop-blur-sm border border-accent/20">
            <CardHeader className="py-6 pb-4 text-center bg-gradient-to-r from-accent to-accent/80 relative overflow-hidden">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 py-2 text-accent-foreground">
                $1/<span className="italic font-light">Month</span>
              </h2>
            </CardHeader>
            <div className="w-full flex items-center justify-center mt-6 px-6">
              <Link
                href="https://buy.stripe.com/dR603Q1Zy6YL7bq007"
                target="_blank"
                className="w-full"
              >
                <ShineButton className="text-base w-full sm:text-lg py-3.5 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground hover:from-accent/90 hover:to-accent/70 border-none font-medium">
                  Subscribe Now
                  <ShoppingCart className="ml-2 h-4 w-4 sm:h-5 sm:w-5 inline" />
                </ShineButton>
              </Link>
            </div>
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center justify-center mb-4">
                <p className="text-muted-foreground text-center">
                  Up to 5 resolved issues per month
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="ml-1.5 inline-flex items-center justify-center">
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        A &quot;resolved issue&quot; is counted when Issue to PR
                        generates a solution that is merged to production
                        (usually &apos;main&apos; branch). Additional manual
                        updates to the same branch still count as one resolved
                        issue. If a PR is not merged to main, it won&apos;t
                        count against your limit.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-muted-foreground mb-4 text-center">
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
                    <div className="min-w-[24px] h-6 flex items-center justify-center bg-accent/20 rounded-full mr-3">
                      <Check
                        size={14}
                        strokeWidth={3}
                        className="text-accent"
                      />
                    </div>
                    <p className="text-sm sm:text-base text-foreground">
                      {feature}
                    </p>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2, duration: 0.5 }}
                  className="w-full text-center mt-2 pt-2 border-t border-border"
                >
                  <p className="text-sm sm:text-base font-medium text-accent">
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
            <TextSm className="text-muted-foreground">
              The price resets if no sales in 72 hours.
            </TextSm>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default Pricing
