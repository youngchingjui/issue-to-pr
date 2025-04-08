import { redirect } from "next/navigation"

import { auth } from "@/auth"

import CheckoutForm from "./CheckoutForm"

export default async function CheckoutPage({
  params,
}: {
  params: { plan: string }
}) {
  const session = await auth()
  const { plan } = params

  // Validate plan parameter
  if (!["pay-per-pr", "subscription"].includes(plan)) {
    redirect("/")
  }

  const prices = {
    "pay-per-pr": {
      amount: 10,
      interval: "per merged PR",
      description: "Pay only for PRs you merge",
      features: [
        "Production-ready code that matches your codebase style",
        "Thorough code review with bug detection",
        "Performance and maintainability improvements",
        "Full control over PR review and merging",
      ],
    },
    subscription: {
      amount: 50,
      interval: "per month",
      description: "Unlimited merged PRs for one repo",
      features: [
        "All pay-per-PR features included",
        "Unlimited PR generations and merges",
        "Priority support",
        "Monthly billing for simplified accounting",
      ],
    },
  }

  const selectedPlan = prices[plan]

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="px-6 py-8 sm:p-10">
            <div className="flex flex-col items-center">
              <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
              <p className="mt-4 text-xl text-gray-600">
                ${selectedPlan.amount} {selectedPlan.interval}
              </p>
              <p className="mt-1.5 text-sm text-gray-500">
                {selectedPlan.description}
              </p>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900">
                Plan Features:
              </h2>
              <ul className="mt-4 space-y-4">
                {selectedPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-6 w-6 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <p className="ml-3 text-base text-gray-700">{feature}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-10">
              <CheckoutForm
                plan={plan}
                isAuthenticated={!!session}
                amount={selectedPlan.amount}
                interval={selectedPlan.interval}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
