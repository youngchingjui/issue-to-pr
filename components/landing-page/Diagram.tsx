"use client"

import Image from "next/image"

export default function Diagram() {
  return (
    <section className="py-20 px-4 bg-white bg-opacity-30 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-12 text-center text-stone-700">
          Multi Agent Workflow
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex items-center justify-center">
            <h3 className="text-xl font-semibold mb-2 text-stone-700">
              Multiple AI agents collaboratively craft the perfect code edit
            </h3>
          </div>
          <div className="flex items-center justify-center">
            {/* Replace this with your actual diagram component or image */}
            <Image
              src="/diagram.svg"
              width={1000}
              height={1000}
              alt="Diagram"
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
