import {
  Github,
  Star,
  GitBranch,
  HelpCircle,
  DollarSign,
  BookOpen,
} from "lucide-react"
import * as motion from "motion/react-client"
import Link from "next/link"

import { auth, signIn } from "@/auth"
import SignOutButton from "@/components/SignOutButton"
import { getGithubUser } from "@/lib/github/users"
import { GitHubUser } from "@/lib/types"
import NavButton from "@/components/ui/nav-button"

export default async function Header() {
  const session = await auth()

  let user: GitHubUser | null = null
  // Check for session first before getting Github user to avoid NextJS dynamic server error
  // https://nextjs.org/docs/messages/dynamic-server-error
  if (session) {
    user = await getGithubUser()
  }

  // Navigation items data
  const navItems = [
    { icon: HelpCircle, label: "How to?", href: "/how-to" },
    { icon: DollarSign, label: "Pricing", href: "/pricing" },
    { icon: BookOpen, label: "Blog", href: "/blog" },
  ]

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex justify-between items-center py-3 px-8 bg-white backdrop-blur-sm"
    >
      <Link href="/" className="group">
        <motion.div
          className="flex items-center gap-2"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <GitBranch
            className="text-stone-700 group-hover:text-green-600 transition-colors"
            size={24}
          />
          <div className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-stone-800 to-green-600 text-lg">
            Issue-to-PR
          </div>
        </motion.div>
      </Link>

      {/* Navigation Links */}
      <div className="flex items-center gap-6">
        {navItems.map((item) => (
          <NavButton
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
          />
        ))}
      </div>

      {user ? (
        <div className="flex space-x-4">
          <Link href={`/${user.login}`}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center px-4 py-2 bg-stone-700 text-stone-100 rounded-md hover:bg-stone-600 transition-colors"
            >
              My Repos
            </motion.button>
          </Link>
          <SignOutButton />
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            className="group"
          >
            <Link
              href="https://github.com/youngchingjui/issue-to-pr"
              target="_blank"
              className="flex items-center px-5 py-2.5 bg-gradient-to-br from-stone-800 to-stone-700 text-stone-50 rounded-lg shadow-lg hover:shadow-xl hover:from-stone-700 hover:to-stone-600"
            >
              <Star
                className="mr-2.5 group-hover:text-yellow-400 transition-colors"
                size={20}
              />
              <span className="font-medium">Star on GitHub</span>
            </Link>
          </motion.button>

          <form
            action={async () => {
              "use server"
              await signIn("github", { redirectTo: "/redirect" })
            }}
          >
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02, translateY: -2 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center px-5 py-2.5 bg-gradient-to-br from-stone-800 to-stone-700 text-stone-50 rounded-lg shadow-lg hover:shadow-xl hover:from-stone-700 hover:to-stone-600 group"
            >
              <Github
                className="mr-2.5 group-hover:text-green-400 transition-colors"
                size={20}
              />
              Sign in with GitHub
            </motion.button>
          </form>
        </div>
      )}
    </motion.header>
  )
}
