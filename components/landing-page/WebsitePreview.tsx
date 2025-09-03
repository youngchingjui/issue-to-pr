import React from "react"

interface WebsitePreviewProps {
  className?: string
}

// A simple, reusable mock website preview with a navbar and hero content.
// Designed for the landing page hero but reusable elsewhere.
export default function WebsitePreview({ className = "" }: WebsitePreviewProps) {
  return (
    <div className={`rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm bg-white/50 dark:bg-neutral-900/40 ${className}`}>
      {/* Window header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60">
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-yellow-400" />
        <span className="h-3 w-3 rounded-full bg-green-400" />
        <div className="ml-3 h-5 flex-1 rounded bg-neutral-200/70 dark:bg-neutral-800/70" />
      </div>

      {/* Mock website content */}
      <div className="relative min-h-[220px] sm:min-h-[280px] md:min-h-[360px] overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky-600 via-blue-700 to-indigo-800" />

        {/* Navbar */}
        <div className="relative z-10">
          <div className="mx-auto max-w-5xl px-4">
            <div className="mt-4 md:mt-5 flex items-center justify-between rounded-full border border-white/15 bg-white/10 backdrop-blur shadow-sm px-3 py-2 text-white">
              {/* Left: logo + brand */}
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-white/90" aria-hidden />
                <span className="hidden sm:inline text-sm font-semibold tracking-wide">Acme</span>
              </div>

              {/* Center: nav links */}
              <nav className="hidden md:flex items-center gap-4 text-sm">
                <span className="text-white/90">Home</span>
                <span className="text-white/70">Projects</span>
                <span className="text-white/70">About</span>
                <span className="text-white/70">Contact</span>
              </nav>

              {/* Right: action */}
              <div>
                <button className="text-xs sm:text-sm font-medium rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-white/90 hover:bg-white/15 transition">Resume</button>
              </div>
            </div>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 flex h-full items-center justify-center">
          <div className="mx-auto max-w-3xl px-6 py-10 sm:py-12 md:py-16 text-center">
            <h3 className="text-white/95 text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              Build. Ship. Repeat.
            </h3>
            <p className="mt-3 text-white/80 text-sm sm:text-base md:text-lg">
              I craft delightful web experiences with great UX and strong engineering.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button className="rounded-md bg-white/95 text-slate-900 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 shadow hover:bg-white">
                View Work
              </button>
              <button className="rounded-md border border-white/30 text-white/95 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-white/10">
                Contact
              </button>
            </div>
          </div>
        </div>

        {/* Decorative gradient flare */}
        <div className="absolute -bottom-20 right-10 h-40 w-40 rounded-full bg-cyan-400/40 blur-2xl" aria-hidden />
      </div>
    </div>
  )
}

