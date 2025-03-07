import React from "react"
import TextLg from "../ui/text-lg"
import FeatureShowcase from "../ui/feature-showcase"
import { ExternalLink } from "lucide-react"
import Link from "next/link"
import ShineButton from "../ui/shine-button"

const Features = () => {
  return (
    <div className="backdrop-blur-sm flex flex-col gap-10 items-center justify-center mt-10 py-20">
      <TextLg>
        <span className="block sm:inline">Why choose</span>{" "}
        <span className="block sm:inline">
          <span className="italic text-green-800 relative">issuetopr.dev?</span>
        </span>
      </TextLg>
      <FeatureShowcase
        items={[
          {
            image:
              "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            title: "Catch Bugs Early",
            description:
              "Spot bugs and errors that might slip through manual reviews.",
          },
          {
            image:
              "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            title: "Improve Code Quality",
            description:
              "Maintain consistent, high-quality code with AI-driven analysis.",
          },
          {
            image:
              "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            title: "Reduce Development Time",
            description: "Slash review times to deploy features faster.",
          },
          {
            image:
              "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            title: "Reduce Manual Checks",
            description:
              "Free your developers from routine checks to focus on innovation.",
          },
        ]}
      />
      <Link
        href="https://github.com/apps/issuetopr-dev"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-14"
        prefetch={false}
      >
        <ShineButton className="text-base sm:text-lg px-4 sm:px-5 md:px-6 py-3 bg-green-800 text-white hover:bg-green-800/70">
          Get Started Today
          <ExternalLink className="ml-2 h-4 w-4 sm:h-5 sm:w-5 inline" />
        </ShineButton>
      </Link>
    </div>
  )
}

export default Features
