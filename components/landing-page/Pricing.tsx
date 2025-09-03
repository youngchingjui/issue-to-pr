"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"
import Link from "next/link"
import React from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import MovingBorderCard from "@/components/ui/moving-border-card"
import ShineButton from "@/components/ui/shine-button"
import TextLg from "@/components/ui/text-lg"
import TextMd from "@/components/ui/text-md"

const Pricing = () => {
  const individualFeatures = [
    "Production-ready code that matches your codebase style",
    "Thorough code review with bug detection",
    "Performance and maintainability improvements",
    "Comprehensive test coverage",
    "Automatic documentation updates",
    "Full control over PR review and merging",
    "Personalized support",
    "Unlimited PR generations",
  ]

  const enterpriseFeatures = [
    "SLA and priority support",
    "SSO/SAML, SCIM provisioning",
    "Role-based access controls",
    "Security review and SOC 2 documentation",
    "Custom integrations and workflows",
    "Self-hosted / VPC deployment options",
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
      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative z-10 text-center mb-12"
      >
        <TextLg className="max-w-2xl">
          <span className="block sm:inline">Simple,</span>{" "}
          <span className="block sm:inline">
            <span className="italic text-accent relative">
              Flat Pricing
              <span className="absolute -bottom-2 left-0 w-full h-1 bg-accent/40" />
            </span>
          </span>
        </TextLg>
      </motion.div>

      {/* Plans grid */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-8 px-4 md:px-0 relative z-10">
        {/* Individual */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          className="w-full"
        >
          <MovingBorderCard wrapperClassName="mt-6 rounded-3xl h-full">
            <Card className="shadow-xl rounded-3xl overflow-hidden bg-white/95 backdrop-blur-sm border border-accent/20 h-full flex flex-col">
              <CardHeader className="py-6 pb-4 text-center bg-gradient-to-r from-accent to-accent/80 relative overflow-hidden">
                <p className="uppercase tracking-wide text-xs font-semibold text-accent-foreground/80">
                  Individual
                </p>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-1 py-2 text-accent-foreground">
                  $5/<span className="italic font-light">Month</span>
                </h2>
                <p className="text-xs text-accent-foreground/90">
                  + token usage
                </p>
              </CardHeader>
              <div className="w-full flex items-center justify-center mt-6 px-6">
                <Link href="#join" className="w-full">
                  <ShineButton className="text-base w-full sm:text-lg py-3.5 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground hover:from-accent/90 hover:to-accent/70 border-none font-medium">
                    Get Started
                  </ShineButton>
                </Link>
              </div>
              <CardContent className="p-6 sm:p-8">
                <p className="text-muted-foreground mb-4 text-center font-medium">
                  Bring&nbsp;Your&nbsp;Own&nbsp;OpenAI&nbsp;API&nbsp;Key
                </p>
                <div className="flex flex-col items-start justify-start space-y-3">
                  {individualFeatures.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * index, duration: 0.25 }}
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

        {/* Teams - Coming Soon */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
          className="w-full"
        >
          <MovingBorderCard wrapperClassName="mt-6 rounded-3xl h-full">
            <Card className="shadow-xl rounded-3xl overflow-hidden bg-white/95 backdrop-blur-sm border border-accent/20 h-full flex flex-col">
              <CardHeader className="py-6 pb-4 text-center bg-gradient-to-r from-accent to-accent/80 relative overflow-hidden">
                <Badge className="absolute top-3 right-3 bg-black/80 text-white border-transparent">
                  Coming soon
                </Badge>
                <p className="uppercase tracking-wide text-xs font-semibold text-accent-foreground/80">
                  Teams
                </p>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-1 py-2 text-accent-foreground">
                  $10/<span className="italic font-light">User</span>
                </h2>
                <p className="text-xs text-accent-foreground/90">
                  per month + token usage
                </p>
              </CardHeader>
              <div className="w-full flex items-center justify-center mt-6 px-6">
                <ShineButton
                  className="text-base w-full sm:text-lg py-3.5 bg-muted text-foreground/70 border-none font-medium"
                  disabled
                >
                  Join Waitlist
                </ShineButton>
              </div>
              <CardContent className="p-6 sm:p-8">
                <p className="text-muted-foreground text-center">
                  Built for collaboration. Role-based access, shared settings,
                  and more.
                </p>
              </CardContent>
            </Card>
          </MovingBorderCard>
        </motion.div>

        {/* Enterprise - Coming Soon */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.3 }}
          className="w-full"
        >
          <MovingBorderCard wrapperClassName="mt-6 rounded-3xl h-full">
            <Card className="shadow-xl rounded-3xl overflow-hidden bg-white/95 backdrop-blur-sm border border-accent/20 h-full flex flex-col">
              <CardHeader className="py-6 pb-4 text-center bg-gradient-to-r from-accent to-accent/80 relative overflow-hidden">
                <Badge className="absolute top-3 right-3 bg-black/80 text-white border-transparent">
                  Coming soon
                </Badge>
                <p className="uppercase tracking-wide text-xs font-semibold text-accent-foreground/80">
                  Enterprise
                </p>
              </CardHeader>
              <div className="w-full flex items-center justify-center mt-6 px-6">
                <Link href="#contact" className="w-full">
                  <ShineButton className="text-base w-full sm:text-lg py-3.5 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground hover:from-accent/90 hover:to-accent/70 border-none font-medium">
                    Contact Us
                  </ShineButton>
                </Link>
              </div>
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col items-start justify-start space-y-3">
                  {enterpriseFeatures.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * index, duration: 0.25 }}
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
          One low monthly price. Cancel anytime.
        </TextMd>
      </motion.div>
    </motion.div>
  )
}

export default Pricing
