import * as motion from "motion/react-client"

import TextLg from "@/components/ui/text-lg"

const points = [
  "Curated prompts and tested workflows guide each agent's focus",
  "Dedicated agents analyse the request, scan the codebase, and draft a concrete implementation plan",
  "Specialised coder agents generate code directly from the plan—no ad-hoc prompting",
  "Reviewer agents open a Pull Request, explain every change, and iterate until checks pass",
  "Automatic task triaging breaks large issues into smaller, parallel-friendly steps",
]

export default function AgentArchitecture() {
  return (
    <section className="relative py-14 px-5 bg-white border-t-2 border-black flex flex-col items-center">
      <TextLg>
        <span className="block sm:inline">Multi-agent</span>{" "}
        <span className="block sm:inline italic text-accent">architecture</span>{" "}
        <span className="block sm:inline">built for code quality</span>
      </TextLg>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl w-full mt-10 items-start">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="space-y-6"
        >
          <p className="text-lg text-muted-foreground">
            Issue To PR coordinates multiple specialised agents, each focused on
            a single stage of the development workflow. The hand-offs are
            deliberate and tested, so every run produces consistent,
            high-quality pull requests—without manual babysitting.
          </p>
          <ul className="list-disc list-inside space-y-3 text-muted-foreground">
            {points.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </motion.div>

        {/* Placeholder for future diagram or illustration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          className="w-full h-full flex items-center justify-center"
        >
          <div className="w-full h-48 md:h-60 lg:h-72 bg-gradient-to-br from-accent/20 to-accent/5 rounded-xl border-2 border-dashed border-accent/50 flex items-center justify-center text-accent/70 text-sm">
            {/* Add diagram or animation here */}
            Agent flow diagram (coming soon)
          </div>
        </motion.div>
      </div>
    </section>
  )
}
