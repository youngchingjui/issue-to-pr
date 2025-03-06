import { LucideIcon } from "lucide-react"
import Link from "next/link"
import * as motion from "motion/react-client"

interface NavButtonProps {
  icon: LucideIcon
  label: string
  href: string
}

/**
 * NavButton component for navigation links with icons
 * Fully responsive across all screen sizes:
 * - Mobile: Shows only icon
 * - Small screens: Shows icon and small text
 * - Medium and larger: Shows icon and normal text
 *
 * @param icon - Lucide icon component to display
 * @param label - Text to display next to the icon
 * @param href - URL to navigate to when clicked
 */
export default function NavButton({ icon: Icon, label, href }: NavButtonProps) {
  return (
    <Link href={href}>
      <motion.button
        whileHover={{ scale: 1.05, translateY: -1 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 text-stone-700 hover:text-green-600 transition-colors group"
        title={label} // Tooltip for mobile users
      >
        <Icon
          size={18}
          className="group-hover:text-green-600 transition-colors"
          aria-hidden="true"
        />
        {/* Hide text on mobile, show on sm and up with responsive text sizes */}
        <span className="hidden sm:inline font-medium text-sm md:text-base">
          {label}
        </span>
      </motion.button>
    </Link>
  )
}
