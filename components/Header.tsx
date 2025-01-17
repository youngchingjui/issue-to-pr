import { Github } from "lucide-react"
import * as motion from "motion/react-client"
import Link from "next/link"

import { signOut } from "@/auth"
import { getGithubUser } from "@/lib/github/users"
import { GitHubUser } from "@/lib/types"

export default async function Header() {
  let user: GitHubUser | null = null
  try {
    user = await getGithubUser()
  } catch (error) {
    console.debug("[DEBUG] User not found: ", error)
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex justify-between items-center py-4 px-6 bg-white bg-opacity-50 backdrop-blur-sm"
    >
      <div className="text-2xl font-bold text-stone-700">Issue-to-PR</div>
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
          <form
            action={async () => {
              "use server"
              await signOut()
            }}
          >
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center px-4 py-2 bg-stone-700 text-stone-100 rounded-md hover:bg-stone-600 transition-colors"
            >
              Logout
            </motion.button>
          </form>
        </div>
      ) : (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center px-4 py-2 bg-stone-700 text-stone-100 rounded-md hover:bg-stone-600 transition-colors"
        >
          <Github className="mr-2" size={20} />
          Login with GitHub
        </motion.button>
      )}
    </motion.header>
  )
}
