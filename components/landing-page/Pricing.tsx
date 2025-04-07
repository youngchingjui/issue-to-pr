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
    "Production-ready code that matches your codebase style",
    "Thorough code review with bug detection",
    "Performance and maintainability improvements",
    "Comprehensive test coverage",
    "Automatic documentation updates",
    "Full control over PR review and merging",
    "Personalized support",
    "Unlimited PR generations",
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
          <span className="block sm:inline">Choose Your Plan,</span>{" "}
          <span className="block sm:inline">
            <span className="italic text-accent relative">
              Pay Your Way
              <span className="absolute -bottom-2 left-0 w-full h-1 bg-accent/40" />
            </span>
          </span>
        </TextLg>
      </motion.div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8 w-full max-w-[340px] md:max-w-5xl relative z-10">
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
          className="flex-1"
        >
          <MovingBorderCard wrapperClassName="mt-6 rounded-3xl">
            <Card className="shadow-xl rounded-3xl overflow-hidden bg-white/95 backdrop-blur-sm border border-accent/20 h-full">
              <CardHeader className="py-6 pb-4 text-center bg-gradient-to-r from-accent to-accent/80 relative overflow-hidden">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 py-2 text-accent-foreground">
                  $10/<span className="italic font-light">Merged PR</span>
                </h2>
              </CardHeader>
              <div className="w-full flex items-center justify-center mt-6 px-6">
                <Link
                  href="https://buy.stripe.com/dR603Q1Zy6YL7bq007"
                  target="_blank"
                  className="w-full"
                >
                  <ShineButton className="text-base w-full sm:text-lg py-3.5 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground hover:from-accent/90 hover:to-accent/70 border-none font-medium">
                    Pay Per PR
                    <ShoppingCart className="ml-2 h-4 w-4 sm:h-5 sm:w-5 inline" />
                  </ShineButton>
                </Link>
              </div>
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center justify-center mb-4">
                  <p className="text-muted-foreground text-center">
                    Only pay for PRs you merge
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
                          Generate unlimited PR solutions but only pay when you
                          approve and merge to your main branch. All revisions
                          and updates to the PR are included at no extra cost.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-muted-foreground mb-4 text-center">
                  Everything you need to ship faster:
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
                </div>
              </CardContent>
            </Card>
          </MovingBorderCard>
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
            delay: 0.4,
          }}
          className="flex-1"
        >
          <MovingBorderCard wrapperClassName="mt-6 rounded-3xl">
            <Card className="shadow-xl rounded-3xl overflow-hidden bg-white/95 backdrop-blur-sm border border-accent/20 h-full">
              <CardHeader className="py-6 pb-4 text-center bg-gradient-to-r from-accent to-accent/80 relative overflow-hidden">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 py-2 text-accent-foreground">
                  $50/<span className="italic font-light">Month</span>
                </h2>
              </CardHeader>
              <div className="w-full flex items-center justify-center mt-6 px-6">
                <Link
                  href="https://buy.stripe.com/6oE6se1Zy5UH9jy9AI"
                  target="_blank"
                  className="w-full"
                >
                  <ShineButton className="text-base w-full sm:text-lg py-3.5 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground hover:from-accent/90 hover:to-accent/70 border-none font-medium">
                    Subscribe
                    <ShoppingCart className="ml-2 h-4 w-4 sm:h-5 sm:w-5 inline" />
                  </ShineButton>
                </Link>
              </div>
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center justify-center mb-4">
                  <p className="text-muted-foreground text-center">
                    Unlimited merged PRs for one repo
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
                          Generate and merge unlimited PRs for a single
                          repository. Perfect for active projects with frequent
                          updates. Contact us for multi-repository discounts.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-muted-foreground mb-4 text-center">
                  All features included:
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
                </div>
              </CardContent>
            </Card>
          </MovingBorderCard>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.7 }}
        className="relative z-10 mt-12"
      >
        <TextMd className="max-w-lg text-center font-medium">
          Both plans include unlimited PR generations - only pay for what you
          use
        </TextMd>
        <div className="flex items-center justify-center mt-3">
          <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm">
            <TextSm className="text-muted-foreground">
              Contact us for multi-repository discounts
            </TextSm>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default Pricing
