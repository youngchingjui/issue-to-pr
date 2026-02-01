import IssueDashboard from "@/components/home/IssueDashboard"
import Benefits from "@/components/landing-page/Benefits"
import Footer from "@/components/landing-page/Footer"
import GetStarted from "@/components/landing-page/GetStarted"
import Hero from "@/components/landing-page/Hero"
import NonDeveloperBenefits from "@/components/landing-page/NonDeveloperBenefits"
import GridBackground from "@/components/ui/grid-background"
import { authWithDiagnostics } from "@/lib/auth/diagnostics"

import OpenAIApiKeyCard from "./OpenAIApiKeyCard"

export default async function LandingPage() {
  const session = await authWithDiagnostics("page.tsx")

  if (session?.user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
          <OpenAIApiKeyCard />
          <IssueDashboard />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <GridBackground>
          <Hero />
          <NonDeveloperBenefits />
          <Benefits />
          <GetStarted />
        </GridBackground>
      </main>
      <Footer />
    </div>
  )
}
