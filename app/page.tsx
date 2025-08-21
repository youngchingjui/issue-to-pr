import nextDynamic from "next/dynamic"

import { auth } from "@/auth"
import IssueDashboard from "@/components/home/IssueDashboard"
import AgentArchitecture from "@/components/landing-page/AgentArchitecture"
import ComparisonToIDEAgents from "@/components/landing-page/ComparisonToIDEAgents"
import Features from "@/components/landing-page/Features"
import Footer from "@/components/landing-page/Footer"
import GetStarted from "@/components/landing-page/GetStarted"
import Hero from "@/components/landing-page/Hero"
import PlanningFeature from "@/components/landing-page/PlanningFeature"
import Pricing from "@/components/landing-page/Pricing"
import Steps from "@/components/landing-page/Steps"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import GridBackground from "@/components/ui/grid-background"
import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"

const ApiKeyInput = nextDynamic(
  () => import("@/components/settings/APIKeyInput"),
  { ssr: false }
)

export default async function LandingPage() {
  const session = await auth()

  if (session?.user) {
    const existingKey = await getUserOpenAIApiKey()

    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
          {!existingKey && (
            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle>OpenAI API Key</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-1">
                    Set your OpenAI API key to run the agents. You can create an
                    API key {""}
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-600"
                    >
                      here
                    </a>
                    , then paste it below.
                  </p>
                  <ApiKeyInput initialKey="" />
                </div>
              </CardContent>
            </Card>
          )}

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
          <AgentArchitecture />
          <PlanningFeature />
          <Steps />
          <Features />
          <ComparisonToIDEAgents />
          <Pricing />
          <GetStarted />
        </GridBackground>
      </main>
      <Footer />
    </div>
  )
}
