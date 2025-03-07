import { ExternalLink } from "lucide-react"
import * as motion from "motion/react-client"
import Link from "next/link"
import Image from "next/image"

import ShineButton from "@/components/ui/shine-button"
import StackedCards from "@/components/ui/stacked-cards"

export default async function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="relative text-center py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 flex flex-col items-center overflow-hidden"
    >
      <motion.div
        animate={{
          background: [
            "radial-gradient(circle, transparent 20%, #FFFFFF, transparent 70%), linear-gradient(-100deg, transparent 20%, #FFFFFF, transparent 70%)",
          ],
          transition: {
            duration: 3,
          },
        }}
        className="w-screen h-screen absolute inset-0 transition-colors"
      />
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="max-w-5xl mx-auto relative z-10"
      >
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold mb-3 sm:mb-6 md:mb-8 leading-tight">
          <span>Automate Pull Requests</span>{" "}
          <span>
            with <br />
            <span className="italic text-green-800 relative">
              AI Powered Insights
              <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-green-800/0 via-green-800 to-green-800/0"></span>
            </span>
          </span>
        </h1>
        <p className="text-stone-600 text-sm sm:text-base md:text-lg mb-8 sm:mb-10 max-w-3xl mx-auto px-2 sm:px-4 md:px-5 w-full text-center leading-relaxed">
          Streamline your development process with issuetopr.dev, a GitHub App
          that uses advanced multi-agent AI workflows to automatically resolve
          issues and create Pull Requests.
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Link
          href="https://github.com/apps/issuetopr-dev"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block"
          prefetch={false}
        >
          <ShineButton className="text-base sm:text-lg px-4 sm:px-5 md:px-6 py-3 bg-green-800 text-white hover:bg-green-800/70">
            Install Github App
            <ExternalLink className="ml-2 h-4 w-4 sm:h-5 sm:w-5 inline" />
          </ShineButton>
        </Link>
      </motion.div>

      <div className="mt-16 relative z-10">
        <StackedCards
          images={[
            "https://images.unsplash.com/photo-1731770241468-8337b047749f?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            "https://images.unsplash.com/photo-1728993559783-f657d4177c6b?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            "https://images.unsplash.com/photo-1638392436949-3e584046314a?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            "https://images.unsplash.com/photo-1726880066148-fdc1ceba7343?q=80&w=3876&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
          ]}
        />
      </div>
    </motion.section>
  )
}
