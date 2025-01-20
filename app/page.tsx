import Details from "@/components/Details"
import Footer from "@/components/Footer"
import Header from "@/components/Header"
import Hero from "@/components/Hero"
import Pricing from "@/components/Pricing"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-orange-50 text-stone-800">
      <Header />
      <main>
        <Hero />
        <Details />
        <Pricing />
      </main>
      <Footer />
    </div>
  )
}
