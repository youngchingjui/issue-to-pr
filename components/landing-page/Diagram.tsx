"use client"

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
          <div className="flex items-center justify-center p-6 bg-green-50 rounded-xl border-2 border-green-100">
            <p className="text-lg text-gray-600">
              Our advanced multi-agent system works by coordinating specialized
              AI agents, each focusing on different aspects of code analysis and
              generation. This collaborative approach ensures high-quality,
              context-aware code solutions.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
