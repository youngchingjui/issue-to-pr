import Details from "@/components/landing-page/Details"
import Diagram from "@/components/landing-page/Diagram"
import Footer from "@/components/landing-page/Footer"
import Hero from "@/components/landing-page/Hero"
import Pricing from "@/components/landing-page/Pricing"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-orange-50 text-stone-800">
      <main>
        <Hero />
        <Details />
        <Diagram />
        <Pricing />
      </main>
      <Footer />
    </div>
  )
}
