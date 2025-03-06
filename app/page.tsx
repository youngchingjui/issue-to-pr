import Details from "@/components/landing-page/Details"
import Diagram from "@/components/landing-page/Diagram"
import Footer from "@/components/landing-page/Footer"
import Header from "@/components/landing-page/Header"
import Hero from "@/components/landing-page/Hero"
import Pricing from "@/components/landing-page/Pricing"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#0f0f0f]">
      <Header />
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
