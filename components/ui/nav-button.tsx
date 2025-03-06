import { LucideIcon } from "lucide-react"
import Link from "next/link"
import * as motion from "motion/react-client"

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
        className="flex items-center gap-2 px-4 py-2 text-stone-700 hover:text-green-600 transition-colors group"
      >
        <Icon
          size={18}
          className="group-hover:text-green-600 transition-colors"
        />
        <span className="font-medium">{label}</span>
      </motion.button>
    </Link>
  )
}
