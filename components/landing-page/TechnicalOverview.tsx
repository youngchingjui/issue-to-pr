import * as motion from "motion/react-client"

import TextLg from "@/components/ui/text-lg"

const points = [
  {
    title: "Versioned by default",
    description:
      "Each agent run happens on a brand-new Git branch. All changes are committed as they go, so you can review diffs, backtrack safely, delete the branch, or continue iterating—all with normal version control.",
  },
  {
    title: "Clear, review-ready PRs",
    description:
      "Pull Requests include a complete description of what changed and why. Reviewers see the plan, rationale, and code changes in one place for faster reviews and better traceability.",
  },
  {
    title: "Isolated execution",
    description:
      "Agents run inside short‑lived, isolated containers with pinned tooling. Your repository and runtime stay clean—no local machine changes or long‑lived processes.",
  },
  {
    title: "Auditable workflow",
    description:
      "Every step is logged with timestamps and artifacts. You have a clear record of decisions, commands, and outputs to audit or reproduce any run.",
  },
]

export default function TechnicalOverview() {
  return (
    <section className="relative py-14 px-5 bg-white border-t-2 border-black flex flex-col items-center">
      <TextLg className="text-center">
        Our Agents Work Safely on New Branches in
        <span className="italic text-accent">&nbsp;Isolated Containers</span>
      </TextLg>

      <div className="mx-auto max-w-6xl w-full mt-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {points.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.05 }}
              className="p-6 rounded-xl border-2 border-black/10 bg-gradient-to-br from-white/5 to-transparent"
            >
              <h3 className="text-xl font-semibold mb-2 text-stone-800">{p.title}</h3>
              <p className="text-muted-foreground">{p.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

