import ContributePublic from "@/components/landing-page/ContributePublic"
import Features from "@/components/landing-page/Features"
import Footer from "@/components/landing-page/Footer"
import GetStarted from "@/components/landing-page/GetStarted"
import Hero from "@/components/landing-page/Hero"
import Pricing from "@/components/landing-page/Pricing"
import Steps from "@/components/landing-page/Steps"
import GridBackground from "@/components/ui/grid-background"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <GridBackground>
          <Hero />
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
