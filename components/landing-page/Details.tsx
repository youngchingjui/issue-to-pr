"use client"

import { Bot, Code, GitBranch, GitPullRequest, ClipboardList, CheckSquare, FileText } from "lucide-react"
import * as motion from "motion/react-client"

const features = [
  {
    icon: <Bot size={24} />, 
    title: "Multiple AI Agents",
    description:
      "Coordinates multiple agents to review and understand your issues.",
  },
  {
    icon: <Code size={24} />, 
    title: "Codebase Analysis",
    description: "Explores solutions based on your specific codebase.",
  },
  {
    icon: <GitPullRequest size={24} />, 
    title: "Automatic PRs",
    description: "Creates pull requests with generated solutions.",
  },
  {
    icon: <GitBranch size={24} />, 
    title: "Safe Changes",
    description:
      "Creates a new branch for changes, keeping your production branch safe.",
  },
  {
    icon: <ClipboardList size={24} />, 
    title: "AI-Driven Plan Generation",
    description: "Generates a plan to resolve your GitHub issues quickly and efficiently.",
  },
  {
    icon: <CheckSquare size={24} />, 
    title: "Automated Issue Resolution",
    description: "Coordinates multiple agents to edit code and resolve issues in your repository.",
  },
  {
    icon: <FileText size={24} />, 
    title: "Comprehensive PR Reviews",
    description: "Conducts in-depth reviews of your pull requests based on guidelines.",
  }
]

export default function Details() {
  return (
    <section className="py-20 px-4 bg-white bg-opacity-30 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-12 text-center text-stone-700">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex items-start space-x-4"
            >
              <div className="bg-amber-100 p-3 rounded-full">
                {feature.icon}
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-stone-700">
                  {feature.title}
                </h3>
                <p className="text-stone-600">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
