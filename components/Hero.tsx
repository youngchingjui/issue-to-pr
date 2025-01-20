import { Github } from "lucide-react"
import * as motion from "motion/react-client"

import { auth, signIn } from "@/auth"
import { getGithubUser } from "@/lib/github/users"
import { GitHubUser } from "@/lib/types"

export default async function Hero() {
  const session = await auth()

  let user: GitHubUser | null = null
  // Check for session first before getting Github user to avoid NextJS dynamic server error
  // https://nextjs.org/docs/messages/dynamic-server-error
  if (session) {
    user = await getGithubUser()
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="text-center py-20 px-4 bg-white bg-opacity-30 backdrop-blur-sm"
    >
      <h1 className="text-4xl md:text-5xl font-bold mb-6 text-stone-700">
        Automatically Resolve Your GitHub Issues and Create Pull Requests
      </h1>
      <form
        action={async () => {
          "use server"
          await signIn("github", { redirectTo: "/dashboard" })
        }}
      >
        <motion.button
          type="submit"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center px-6 py-3 bg-amber-700 text-amber-50 rounded-md hover:bg-amber-600 transition-colors mx-auto text-lg"
        >
          <Github className="mr-2" size={24} />
          {user ? "View my repositories" : "Login with GitHub"}
        </motion.button>
      </form>
      {!user && (
        <p className="mt-4 text-stone-500">
          to automatically resolve your GitHub issues
        </p>
      )}
    </motion.section>
  )
}
