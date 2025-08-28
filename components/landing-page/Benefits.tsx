import { CheckCircle2 } from "lucide-react"
import * as motion from "motion/react-client"
import React from "react"

import TextLg from "@/components/ui/text-lg"

const benefits: { title: string; description: string }[] = [
  {
    title: "Automatic first‑pass PRs for each issue",
    description:
      "Our agents turn every issue into an initial pull request so you can review concrete changes fast.",
  },
  {
    title: "Surface unclear requirements early",
    description:
      "PRs and previews highlight missing details and assumptions before work goes too far.",
  },
  {
    title: "30% of PRs merge as‑is",
    description:
      "A meaningful share of first‑pass PRs are merged without further edits—speed without sacrificing quality.",
  },
  {
    title: "Cut resolution time by 50%",
    description:
      "Automated planning, search, and change generation reduce time spent per issue by half.",
  },
  {
    title: "Preview how an agent would solve a task",
    description:
      "See the proposed plan and diffs up‑front—keep control while moving faster.",
  },
  {
    title: "Smart research to find relevant files",
    description:
      "Agents scan your repo to identify impacted files, references, and context before writing code.",
  },
]

export default function Benefits() {
  return (
    <section className="relative py-14 px-5 bg-white border-t-2 border-black flex flex-col items-center">
      <TextLg className="text-center max-w-5xl">
        <span className="block sm:inline">Have a large list of tasks</span>{" "}
        <span className="block sm:inline">
          and don&apos;t know how to get started?
        </span>
      </TextLg>

      <p className="text-muted-foreground text-base sm:text-lg max-w-3xl text-center">
        Issue To PR turns your backlog into momentum—making it easy to start,
        review, and ship.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl w-full mt-10">
        {benefits.map((b, idx) => (
          <motion.div
            key={`benefit-${idx}`}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{
              duration: 0.5,
              ease: "easeOut",
              delay: 0.05 * (idx % 3),
            }}
            className="group relative rounded-xl border-2 border-black/10 bg-gradient-to-br from-white to-transparent p-6 hover:border-black/20 transition-colors"
          >
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-6 w-6 text-accent mt-1 shrink-0" />
              <div>
                <h3 className="text-lg font-semibold leading-snug">
                  {b.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {b.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
