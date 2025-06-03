import matter from "gray-matter"
import Link from "next/link"
import path from "path"

import { createDirectoryTree, getFileContent } from "@/lib/fs"
import { BlogPost } from "@/lib/types"

// List all markdown blog posts and link to each by slug
export default async function BlogIndexPage() {
  const blogsDir = path.join(process.cwd(), "blogs")
  const fileTree = await createDirectoryTree(blogsDir)
  // Only consider .md files at root
  const blogFiles = fileTree.filter(
    (file) => file.endsWith(".md") && !file.includes(path.sep)
  )

  // Fetch blog metadata
  const blogs: BlogPost[] = await Promise.all(
    blogFiles.map(async (filename) => {
      const fullPath = path.join(blogsDir, filename)
      const contents = await getFileContent(fullPath)
      const { data } = matter(contents)
      const slug = filename.replace(/\.md$/, "")
      return {
        slug,
        title: data.title ?? slug,
        date: data.date ? new Date(data.date) : null,
        summary: data.Summary ?? data.summary ?? "",
      }
    })
  )

  // Sort by date (if available)
  blogs.sort((a, b) => {
    if (a.date && b.date) return b.date.getTime() - a.date.getTime()
    if (a.date) return -1
    if (b.date) return 1
    if (a.slug && b.slug) return a.slug.localeCompare(b.slug)
    return 0
  })

  return (
    <div className="container max-w-2xl py-10 mx-auto">
      <h1 className="text-3xl font-bold mb-8">Blogs</h1>
      <ul className="space-y-8">
        {blogs.map((blog) => (
          <li key={blog.slug}>
            <Link
              href={`/blogs/${blog.slug}`}
              className="text-2xl font-semibold text-blue-700 hover:underline dark:text-blue-400"
            >
              {blog.title}
            </Link>
            {blog.date && (
              <span className="block text-xs text-muted-foreground mt-1">
                {blog.date.toLocaleDateString()}
              </span>
            )}
            {blog.summary && (
              <p className="mt-2 text-base text-stone-600 dark:text-stone-300">
                {blog.summary}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
