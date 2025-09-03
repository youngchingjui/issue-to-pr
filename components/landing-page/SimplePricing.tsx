"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"
import Link from "next/link"
import React from "react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import MovingBorderCard from "@/components/ui/moving-border-card"
import ShineButton from "@/components/ui/shine-button"
import TextLg from "@/components/ui/text-lg"
import TextMd from "@/components/ui/text-md"

type SimplePricingProps = {
  paymentLink?: string
}

const DEFAULT_PAYMENT_LINK =
  process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || 
  "#" // TODO: Replace with your Stripe payment link

export default function SimplePricing({
  paymentLink = DEFAULT_PAYMENT_LINK,
}: SimplePricingProps) {
  const features = [
    "One straightforward plan — no tiers",
    "Professional UI for your issues to PRs workflow",
    "Cancel anytime",
  ]

  return (
    <motion.section
      id="pricing"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6 }}
      className="relative py-16 sm:py-20 flex flex-col items-center justify-center overflow-hidden border-t-2 border-black"
    >
      <div className="text-center mb-10">
        <TextLg className="max-w-2xl">
          <span className="italic text-accent">Simple</span>, beautiful, and
          professional pricing
        </TextLg>
        <TextMd className="mt-2 text-muted-foreground">
          One plan that fits most builders
        </TextMd>
      </div>

      <div className="w-full max-w-4xl px-4">
        <MovingBorderCard wrapperClassName="rounded-3xl h-full">
          <Card className="shadow-xl rounded-3xl overflow-hidden bg-white/95 backdrop-blur-sm border border-accent/20 h-full flex flex-col">
            <CardHeader className="py-8 text-center bg-gradient-to-r from-accent to-accent/80">
              <h2 className="text-4xl sm:text-5xl font-bold text-accent-foreground">
                $10
              </h2>
              <p className="text-sm text-accent-foreground/90 mt-1">
                Simple plan — pay once to get started
              </p>
            </CardHeader>

            <div className="w-full flex items-center justify-center mt-6 px-6">
              <Link href={paymentLink} className="w-full" target={paymentLink.startsWith("http") ? "_blank" : undefined}>
                <ShineButton className="text-base w-full sm:text-lg py-3.5 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground hover:from-accent/90 hover:to-accent/70 border-none font-medium">
                  Buy now — $10
                </ShineButton>
              </Link>
            </div>

            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col items-start justify-start space-y-3 max-w-xl mx-auto">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, x: -5 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.05 * index, duration: 0.25 }}
                    className="flex items-start"
                  >
                    <div className="min-w-[24px] h-6 flex items-center justify-center bg-accent/20 rounded-full mr-3">
                      <Check size={14} strokeWidth={3} className="text-accent" />
                    </div>
                    <p className="text-sm sm:text-base text-foreground">{feature}</p>
                  </motion.div>
                ))}
              </div>
              <div className="text-center mt-6">
                <Link href="/pricing" className="underline underline-offset-4 text-muted-foreground hover:text-foreground">
                  Learn more about pricing
                </Link>
              </div>
            </CardContent>
          </Card>
        </MovingBorderCard>
      </div>
    </motion.section>
  )
}

