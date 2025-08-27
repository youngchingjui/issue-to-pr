import { GitPullRequest, Rocket, Share2, ShieldCheck, SquareDashedBottomCode } from "lucide-react"
import * as motion from "motion/react-client"
import React from "react"

import TextLg from "@/components/ui/text-lg"

const points = [
  {
    icon: GitPullRequest,
    title: "Preview builds for every PR",
    description:
      "Each pull request comes with its own preview build you can open in the browser and review end‑to‑end.",
  },
  {
    icon: Rocket,
    title: "Iterate on ideas in parallel",
    description:
      "Test multiple directions at once, compare options side‑by‑side, and move faster with evidence, not guesswork.",
  },
  {
    icon: Share2,
    title: "Share links for instant feedback",
    description:
      "Send a preview URL to teammates or stakeholders—no local setup, no installs, just click and try.",
  },
  {
    icon: ShieldCheck,
    title: "Safe by design",
    description:
      "Previews are isolated from production and can be turned off anytime, keeping your main app safe.",
  },
]

export default function NonDeveloperBenefits() {
  return (
    <section className="relative py-14 px-5 bg-white border-t-2 border-black flex flex-col items-center">
      <TextLg className="text-center max-w-4xl">
        <span className="block sm:inline">Want to preview an app idea</span>{" "}
        <span className="block sm:inline italic text-accent">without relying on developers?</span>
      </TextLg>

      <p className="text-muted-foreground text-lg md:text-xl text-center max-w-3xl mt-4">
        Explore feature ideas, validate flows, and collect feedback using reviewable preview builds—no code required.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl w-full mt-10">
        {points.map((p, idx) => (
          <motion.div
            key={`ndb-${idx}`}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 * idx }}
            className="rounded-xl border-2 border-black/10 bg-gradient-to-br from-white/60 to-transparent p-5 hover:border-black/20 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="mt-1 shrink-0 rounded-lg bg-accent/10 text-accent p-2">
                {React.createElement(p.icon, { className: "w-5 h-5" })}
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">{p.title}</h3>
                <p className="text-muted-foreground">{p.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 text-sm text-muted-foreground flex items-center gap-2">
        <SquareDashedBottomCode className="w-4 h-4" />
        <span>Every preview is tied to a plan and PR for full traceability.</span>
      </div>
    </section>
  )
}

