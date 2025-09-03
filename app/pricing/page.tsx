import SimplePricing from "@/components/landing-page/SimplePricing"

export const metadata = {
  title: "Pricing | Issue To PR",
  description: "Simple, beautiful, and professional pricing with a single $10 plan.",
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <SimplePricing />
      </main>
    </div>
  )
}

