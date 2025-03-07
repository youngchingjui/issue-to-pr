import { Flame } from "lucide-react"
import Link from "next/link"
import ShineButton from "../ui/shine-button"
import TextLg from "../ui/text-lg"
import TextSm from "../ui/text-sm"

export default function GetStarted() {
  return (
    <section className="text-center flex flex-col items-center w-full mx-auto">
      <div className="w-full max-w-full mx-auto pb-16 px-4 relative flex flex-col items-center overflow-hidden shadow-lg py-16">
        <div
          style={{
            background:
              "linear-gradient(135deg, #0ea5e9, #10b981, #84cc16, #22d3ee)",
            backgroundSize: "400% 400%",
            clipPath: "polygon(0 50%, 100% 35%, 100% 100%, 0 100%)",
            animation: "gradientFlow 8s ease infinite",
          }}
          className="absolute top-0 left-0 w-full h-full"
        />
        <div className="rounded-xl backdrop-blur-xl bg-white/30 relative z-10 p-10">
          <TextLg className="text-center ">
            Get{" "}
            <span className="text-center italic text-green-800">started!</span>
          </TextLg>
          <div className="max-w-xl">
            <TextSm>
              Install the Issue to PR GitHub App onto your repository.
            </TextSm>
            <TextSm>
              Done! Issue To PR will now automatically review newly-created Pull
              Requests with a follow-on comment.
            </TextSm>
          </div>
          <Link
            href="https://github.com/apps/issuetopr-dev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-10 max-w-lg w-full"
            prefetch={false}
          >
            <ShineButton className="text-base sm:text-lg px-4 sm:px-5 md:px-6 py-3 bg-black text-white hover:bg-black/70 w-full">
              Download
              <Flame className="ml-2 h-4 w-4 sm:h-5 sm:w-5 inline" />
            </ShineButton>
          </Link>
        </div>
      </div>
    </section>
  )
}
