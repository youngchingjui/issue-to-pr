import * as motion from "motion/react-client"

import PlanSummaryCard from "@/components/landing-page/PlanSummaryCard"
import TextLg from "@/components/ui/text-lg"

export default function PlanningFeature() {
  return (
    <section className="relative py-14 px-5 bg-white border-t-2 border-black flex flex-col items-center">
      <TextLg>
        <span className="block sm:inline">Plan&nbsp;first,</span>{" "}
        <span className="block sm:inline italic text-accent">
          code&nbsp;second
        </span>
      </TextLg>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl w-full mt-10 items-start">
        <div className="space-y-6">
          <p className="text-lg text-muted-foreground">
            Each issue turns into a concrete implementation plan before any code
            is written.
          </p>
          <ul className="list-disc list-inside space-y-3 text-muted-foreground">
            <li>
              Scans your codebase to fill in gaps the original prompt left out.
            </li>
            <li>Lists every assumption it had to make—no surprises.</li>
            <li>
              Click an assumption to pick a different option or edit the text
              directly.
            </li>
            <li>
              Let the LLM rewrite a step or accept your manual edits—your
              choice.
            </li>
            <li>
              The generated pull request follows the revised plan line-by-line.
            </li>
          </ul>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full rounded-xl"
        >
          <PlanSummaryCard />
        </motion.div>
      </div>
    </section>
  )
}
