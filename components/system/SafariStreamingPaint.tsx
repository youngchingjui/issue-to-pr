import { headers } from "next/headers"

type Props = {
  count?: number // how many hidden nodes to emit (defaults tuned for Safari)
}

export default function SafariStreamingPaint({ count = 1000 }: Props) {
  const ua = headers().get("user-agent") || ""

  const isWebKit = /\bAppleWebKit\b/i.test(ua)
  const isChromiumFamily = /\bChrome\b|\bCriOS\b|\bChromium\b|\bEdg\b/i.test(ua)
  const isWebKitOnly = isWebKit && !isChromiumFamily

  if (!isWebKitOnly) return null

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-0 h-0 overflow-hidden" aria-hidden>
          hidden text
        </div>
      ))}
    </>
  )
}
