import React from "react"
import TextLg from "../ui/text-lg"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card"

const comparisons = [
  {
    category: "Promptless Automation",
    issueToPr: "No manual prompt writing or context curation. Issue To PR pulls all the details from GitHub issues, codebase, and history automatically—always.",
    ideAgent: "IDE agents (e.g., chat-bots) often require hand-crafted prompts, repeated explanations, and manual curation for every session.",
  },
  {
    category: "Parallel Work",
    issueToPr: "Unlimited issues and PRs are processed in parallel—the system never blocks you waiting for a previous PR to finish.",
    ideAgent: "Most agents require one-at-a-time focus; manual effort is needed to manage or keep tasks in sync.",
  },
  {
    category: "Review & QA Focus",
    issueToPr: "Built to surface rationale and assumptions for easier review, not just to code on command.",
    ideAgent: "Outputs code, but rarely explains agent rationale or fits directly into your team’s PR review workflow.",
  },
  {
    category: "Integrated Collaboration",
    issueToPr: "Update plans or code by commenting directly in GitHub—no jumping to separate UIs or chat windows.",
    ideAgent: "Edits often require direct IDE intervention, extra tools, or swapping context repeatedly.",
  },
  {
    category: "Traceability & Agent Reasoning",
    issueToPr: "Every PR and plan is traceable, with agent's logic and evidence attached—always see not just the 'what', but the 'why.'",
    ideAgent: "Most IDE assistants operate in a black box, giving code outputs but not decisions or evidence for their process.",
  },
  {
    category: "Automatic QA (Tests/Lint)",
    issueToPr: "Agents aim for tests to pass and lints to clear. Automated verification and rapid retry are core goals (full test/lint integration is rolling out).",
    ideAgent: "Manual test/lint running or fixing is on the developer; automations are rarely end-to-end or automatic.",
  },
]

export default function ComparisonToIDEAgents() {
  return (
    <div className="relative py-14 px-5 bg-white border-t-2 border-black flex flex-col items-center">
      <TextLg>
        <span className="block sm:inline">Why not just use</span>{' '}
        <span className="block sm:inline"><span className="italic text-accent relative">IDE Agents?</span></span>
      </TextLg>
      <div className="w-full max-w-6xl mt-10 grid grid-cols-1 md:grid-cols-2 gap-7">
        {comparisons.map((c, i) => (
          <Card key={i} className="bg-white/80 border-black/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl text-accent font-bold">{c.category}</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-6 pb-6">
              <div className="flex-1">
                <CardDescription>
                  <span className="font-semibold text-green-700">Issue To PR:</span>{' '}{c.issueToPr}
                </CardDescription>
              </div>
              <div className="flex-1">
                <CardDescription>
                  <span className="font-semibold text-orange-700">IDE Agent:</span>{' '}{c.ideAgent}
                </CardDescription>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
