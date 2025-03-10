import { LucideIcon } from "lucide-react"
import * as motion from "motion/react-client"
import Link from "next/link"

interface NavButtonProps {
  icon: LucideIcon
  label: string
  href: string
}

export default function NavButton({ icon: Icon, label, href }: NavButtonProps) {
  return (
    <Link href={href}>
      <motion.button
        whileHover={{ scale: 1.05, translateY: -1 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 text-stone-700 hover:text-accent transition-colors group"
        title={label} // Tooltip for mobile users
      >
        <Icon
          size={18}
          className="group-hover:text-accent transition-colors"
          aria-hidden="true"
        />
        {/* Hide text on mobile, show on sm and up with responsive text sizes */}
        <span className="hidden sm:inline font-medium text-xs md:text-sm">
          {label}
        </span>
      </motion.button>
    </Link>
  )
}
