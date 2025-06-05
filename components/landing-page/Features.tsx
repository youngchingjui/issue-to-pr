import { Flame } from "lucide-react"
import * as motion from "motion/react-client"
import Link from "next/link"
import React from "react"

import ShineButton from "@/components/ui/shine-button"
import TextLg from "@/components/ui/text-lg"

const features = [
  {
    title: "AI-Assisted, End-to-End Workflow",
    description:
      "Resolve GitHub issues and generate pull requests automatically, powered by transparent AI agents. No more context switching or manual repetition—the system manages the entire process from understanding the issue to forming the PR. Save time and mental energy, focusing on higher-value work while repetitive steps are handled seamlessly.",
  },
  {
    title: "Unmatched Developer-in-the-Loop Control",
    description:
      "Intervene at any step—pause, modify, guide AI reasoning, or override actions. Unlike black-box automation, you retain full agency and can always direct the workflow as desired. Gain trust in the results and ensure changes always match your standards and business needs.",
  },
  {
    title: "Real-Time Transparency & Explainability",
    description:
      "Visualize the AI agent’s thought process, code analysis, proposed changes, and data sources in real time. See not only what is being done, but why—complete with linked reasoning and traceability. Build confidence in automated decisions, debug issues faster, and ensure regulatory or team process compliance.",
  },
  {
    title: "Collaborative, Interactive Change Management",
    description:
      "Review, approve, or reject granular changes pre-commit; add comments, constraints, and guidance at any point. The system adapts to your context, enabling deep collaboration between you and the AI. Achieve higher-quality outcomes and avoid misunderstandings, with less rework in code review.",
  },
  {
    title: "Automated, High-Quality Pull Requests",
    description:
      "Automatically produces PRs with checked diffs, clear descriptions, linked issues, and QA/test results. Minimizes tedious manual steps and enforces consistency in PR metadata. Speed up team reviews and increase contribution velocity, with confidence in every submission.",
  },
  {
    title: "Seamless GitHub Integration & Security",
    description:
      "Integrates directly with GitHub APIs, respecting repository permissions and security protocols. No tool juggling or risky manual scripts—secure automation in your trusted workflow. Onboard and scale easily, knowing your repositories and data are safe.",
  },
  {
    title: "Parallel Pull Requests (PRs) from Multiple Issues",
    description:
      "Tackle many issues at once—agents generate and manage multiple PRs in parallel, not serially, keeping your team unblocked. No need to wait for one PR to finish before the next starts.",
  },
  {
    title: "Automatic Plan Generation & Surfacing Assumptions",
    description:
      "Every issue triggers a detailed plan. The app lists all detected assumptions and traces evidence from your codebase, giving you full context before implementation starts.",
  },
  {
    title: "Update Plans Instantly via GitHub Comments",
    description:
      "Change the agent’s plan with just a GitHub comment—use @issue-to-pr to refine scope, clarify, or reprioritize with no separate dashboards required.",
  },
  {
    title: "Iterative Agents: Automatic Test/Lint (Coming Soon)",
    description:
      "Agents don’t just generate code—they iterate until your PR passes tests and lints. Feedback triggers rapid, automatic rework for higher accuracy. (Feature in preview)",
  },
  {
    title: "Accelerated Review with Traceable Reasoning",
    description:
      "Plans and PRs come with agent rationale, reducing time spent in code review and context switching. Understand why each decision was made, and trust every change.",
  }
]

const Features = () => {
  return (
    <div className="relative py-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />

      <div className="absolute inset-0 w-full h-full">
        <motion.div
          className="absolute top-20 left-[10%] w-32 h-32 rounded-full bg-accent/50 backdrop-blur-sm"
          animate={{
            y: [0, -15, 0],
            x: [0, 10, 0],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="absolute bottom-40 right-[15%] w-40 h-40 rounded-full bg-accent/50 backdrop-blur-sm"
          animate={{
            y: [0, 20, 0],
            x: [0, -15, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />

        <motion.div
          className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full bg-secondary/60 backdrop-blur-sm"
          animate={{
            y: [0, 10, 0],
            x: [0, -10, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />

        <motion.div
          className="absolute top-1/3 left-1/4 w-16 h-16 rounded-full bg-muted/40 backdrop-blur-sm"
          animate={{
            y: [0, 12, 0],
            x: [0, 8, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />

        <motion.div
          className="absolute bottom-20 left-[20%] w-20 h-20 rounded-full bg-secondary/50 backdrop-blur-sm"
          animate={{
            y: [0, -10, 0],
            x: [0, 5, 0],
          }}
          transition={{
            duration: 6.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5,
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col gap-10 items-center justify-center px-4">
        <TextLg>
          <span className="block sm:inline">Why choose</span>{" "}
          <span className="block sm:inline">
            <span className="italic text-accent relative">Issue To PR?</span>
          </span>
        </TextLg>
        <div className="flex flex-col max-w-[1300px] w-full gap-12 px-5 lg:px-10">
          {features.map((item, i) => (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{
                opacity: 1,
                transition: {
                  duration: 0.6,
                  ease: "easeOut",
                  delay: 0.2,
                },
              }}
              viewport={{ once: true }}
              key={`feature-item-${i}`}
              className="w-full bg-gradient-to-br from-white/5 to-transparent p-6 rounded-xl border-2 border-black/10 hover:border-black/20 transition-all duration-300"
            >
              <div className="flex flex-col gap-4">
                <h3 className="text-2xl font-bold text-accent">{item.title}</h3>
                <p className="text-lg text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
        <Link
          href="https://github.com/apps/issuetopr-dev"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-14"
          prefetch={false}
        >
          <ShineButton className="text-base sm:text-lg px-4 sm:px-5 md:px-6 py-3 bg-accent text-accent-foreground hover:bg-accent/70">
            Get Started Today
            <Flame className="ml-2 h-4 w-4 sm:h-5 sm:w-5 inline" />
          </ShineButton>
        </Link>
      </div>
    </div>
  )
}

export default Features
