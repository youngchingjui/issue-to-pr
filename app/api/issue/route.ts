import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import simpleGit from "simple-git"
import { Octokit } from "@octokit/rest"
import { generateNewContent } from "@/lib/utils"

const EXISTING_CONTENT = `
import { sectionData, SectionData } from "@/data/mockData"
import Section from "@/components/Section"

const fetchData = async (): Promise<SectionData[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(sectionData)
    }, 1000)
  })
}

export default async function PortfolioPage() {
  const data = await fetchData()

  console.log("saving some new code")

  return (
    <div className="min-h-screen text-primary-foreground bg-gradient-to-br from-teal-800 via-teal-500 to-blue-300">
      <header className="container mx-auto pt-52 pb-6 px-4 bg-opacity-80 backdrop-blur-sm">
        <h1 className="text-5xl font-bold font-rokkitt">Young & AI</h1>
      </header>
      <main className="container mx-auto px-4 py-8">
        {data.map((section, index) => (
          <Section key={index} data={section} />
        ))}
      </main>
    </div>
  )
}`

const INSTRUCTIONS = `
  You are a software engineer. You are given a file that contains existing code. 
  
  Please add any error checking that's needed.
  `

export async function POST() {
  const projectPath = path.join(process.env.HOME, "Projects", "young-and-ai")

  // Define the path to the target file
  const targetPath = path.join(projectPath, "app", "page.tsx")

  // Initialize git
  const git = simpleGit(projectPath)

  // Initialize GitHub client
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  })

  // The new content to write
  const newContent = await generateNewContent(EXISTING_CONTENT, INSTRUCTIONS)

  console.log(newContent)

  try {
    // Check if branch exists
    const branches = await git.branchLocal()
    if (!branches.all.includes("testing")) {
      // Create new branch if it doesn't exist
      await git.branch(["testing"])
    }

    // Checkout the branch (now we know it exists)
    await git.checkout("testing")

    // Write the file
    await fs.writeFile(targetPath, newContent.code, "utf8")

    // Stage and commit the changes
    await git.add(targetPath)
    await git.commit("Update page.tsx with new portfolio content")

    // Push the branch to GitHub
    await git.push("origin", "testing", ["--set-upstream"])

    // Create pull request
    const pr = await octokit.pulls.create({
      owner: "youngchingjui",
      repo: "young-and-ai",
      title: "Update portfolio page",
      head: "testing",
      base: "main",
      body: "Automated pull request to update the portfolio page.",
    })

    return NextResponse.json({
      success: true,
      message: "Branch created, changes committed, and PR created successfully",
      prUrl: pr.data.html_url,
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json(
      { success: false, message: "Operation failed", error: String(error) },
      { status: 500 }
    )
  }
}
