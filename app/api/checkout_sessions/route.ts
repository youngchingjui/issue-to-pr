import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { stripe } from "@/lib/stripe"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const headersList = headers()
    const origin = headersList.get("origin")
    const body = await request.json()
    const { plan, amount } = body

    let priceId: string
    if (plan === "pay-per-pr") {
      // Create or retrieve a metered price for pay-per-PR
      const product = await stripe.products.create({
        name: "Pay Per PR",
        description: "Pay only for PRs you merge",
      })

      const price = await stripe.prices.create({
        product: product.id,
        currency: "usd",
        unit_amount: amount * 100, // Convert to cents
        recurring: {
          usage_type: "metered",
          meter: "mtr_61SKYsloQCrtMly5V41JJUWoGcvyBSoq",
          interval: "month",
        },
      })
      priceId = price.id
    } else {
      // Create or retrieve a subscription price
      const product = await stripe.products.create({
        name: "Monthly Subscription",
        description: "Unlimited merged PRs for one repo",
      })

      const price = await stripe.prices.create({
        product: product.id,
        currency: "usd",
        unit_amount: amount * 100, // Convert to cents
        recurring: {
          interval: "month",
        },
      })
      priceId = price.id
    }

    // Create Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: plan === "pay-per-pr" ? "payment" : "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/${plan}?canceled=true`,
      customer_email: session.user?.email || undefined,
      metadata: {
        userId: session.user?.id,
        plan,
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error("Error creating checkout session:", err)
    return NextResponse.json(
      { error: err.message },
      { status: err.statusCode || 500 }
    )
  }
}
