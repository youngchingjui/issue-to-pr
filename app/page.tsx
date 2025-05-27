import ContributePublic from "@/components/landing-page/ContributePublic"
import Features from "@/components/landing-page/Features"
import Footer from "@/components/landing-page/Footer"
import GetStarted from "@/components/landing-page/GetStarted"
import Hero from "@/components/landing-page/Hero"
import Pricing from "@/components/landing-page/Pricing"
import Steps from "@/components/landing-page/Steps"
import GridBackground from "@/components/ui/grid-background"
import { useEffect, useState } from "react"

function AIMergedPRsTestimonial() {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    fetch("/api/ai-merged-prs-count")
      .then(res => res.json())
      .then(data => setCount(data.count))
      .catch(() => setCount(0))
  }, [])
  if (count == null) return <div className="my-8 text-center text-2xl font-bold text-accent">Loading AI PRs merged ...</div>
  return (
    <div className="my-8 text-center text-2xl font-bold text-accent">
      {count > 0
        ? `${count} AI-generated PRs merged to production 🎉`
        : "Be the first to merge an AI-generated PR!"}
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <GridBackground>
          <Hero />
          <AIMergedPRsTestimonial />
          <Features />
          <ContributePublic />
          <Steps />
          <Pricing />
          <GetStarted />
        </GridBackground>
      </main>
      <Footer />
    </div>
  )
}
