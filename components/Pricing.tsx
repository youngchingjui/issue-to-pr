"use client"

import * as motion from "motion/react-client"
import { useEffect, useState } from "react"

const fibonacciSequence = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144]

export default function Pricing() {
  const [currentPrice, setCurrentPrice] = useState(1)
  const [lastSaleTime, setLastSaleTime] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(
      () => {
        const now = Date.now()
        if (now - lastSaleTime > 72 * 60 * 60 * 1000) {
          setCurrentPrice((prevPrice) =>
            Math.max(
              1,
              fibonacciSequence[fibonacciSequence.indexOf(prevPrice) - 1]
            )
          )
          setLastSaleTime(now)
        }
      },
      60 * 60 * 1000
    ) // Check every hour

    return () => clearInterval(timer)
  }, [lastSaleTime])

  const handlePurchase = () => {
    setCurrentPrice((prevPrice) => {
      const nextIndex = fibonacciSequence.indexOf(prevPrice) + 1
      return nextIndex < fibonacciSequence.length
        ? fibonacciSequence[nextIndex]
        : prevPrice
    })
    setLastSaleTime(Date.now())
  }

  return (
    <section className="py-20 px-4 bg-stone-100 bg-opacity-50">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-8 text-stone-700">
          Simple Pricing
        </h2>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white p-8 rounded-lg shadow-lg"
        >
          <p className="text-4xl font-bold mb-4 text-stone-700">
            ${currentPrice}/month
          </p>
          <p className="mb-6 text-stone-600">Bring your own OpenAI API key</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePurchase}
            className="px-6 py-3 bg-amber-700 text-amber-50 rounded-md hover:bg-amber-600 transition-colors text-lg"
          >
            Subscribe Now
          </motion.button>
          <p className="mt-4 text-sm text-stone-500">
            Price increases with each sale. Resets if no sales in 72 hours.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
