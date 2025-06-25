import AgentArchitecture from "@/components/landing-page/AgentArchitecture"
import ComparisonToIDEAgents from "@/components/landing-page/ComparisonToIDEAgents"
import ContributePublic from "@/components/landing-page/ContributePublic"
import Features from "@/components/landing-page/Features"
import Footer from "@/components/landing-page/Footer"
import GetStarted from "@/components/landing-page/GetStarted"
import Hero from "@/components/landing-page/Hero"
import PlanningFeature from "@/components/landing-page/PlanningFeature"
import Pricing from "@/components/landing-page/Pricing"
import Steps from "@/components/landing-page/Steps"
import GridBackground from "@/components/ui/grid-background"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <GridBackground>
          <Hero />
          <AgentArchitecture />
          <PlanningFeature />
          <Steps />
          <Features />
          <ComparisonToIDEAgents />
          <ContributePublic />
          <Pricing />
          <GetStarted />
        </GridBackground>
      </main>
      <Footer />
    </div>
  )
}
