"use client"

import AuthButton from "@/components/landing-page/AuthButton"
import TextLg from "@/components/ui/text-lg"

export default function GetStarted() {
  return (
    <section className="relative py-14 px-5 bg-white border-t-2 border-black flex flex-col items-center">
      <TextLg className="text-center">Ready to get started?</TextLg>
      <div className="mt-6">
        <AuthButton />
      </div>
    </section>
  )
}

