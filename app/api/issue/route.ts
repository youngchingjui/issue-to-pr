import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import simpleGit from "simple-git"

export async function POST() {
  const projectPath = path.join(process.env.HOME, "Projects", "young-and-ai")

  // Define the path to the target file
  const targetPath = path.join(projectPath, "app", "page.tsx")

  // Initialize git
  const git = simpleGit(projectPath)

  // The new content to write
  const newContent = `import { sectionData, SectionData } from "@/data/mockData"
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

  try {
    // Create and checkout new branch
    await git.checkoutLocalBranch("testing")

    // Write the file
    await fs.writeFile(targetPath, newContent, "utf8")

    return NextResponse.json({
      success: true,
      message: "Branch created and file updated successfully",
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json(
      { success: false, message: "Operation failed", error: String(error) },
      { status: 500 }
    )
  }
}
