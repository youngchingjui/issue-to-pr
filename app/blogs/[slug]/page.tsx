import matter from "gray-matter"
import path from "path"

import MarkdownRenderer from "@/components/blog/MarkdownRenderer"
import { getFileContent } from "@/lib/fs"
import { BlogPost } from "@/lib/types"

interface Params {
  params: { slug: string }
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = params
  const blogDir = path.join(process.cwd(), "blogs")
  const file = path.join(blogDir, `${slug}.md`)

  const fileContent = await getFileContent(file)
  const parsed = matter(fileContent)
  const blogPost: BlogPost = {
    slug,
    title: parsed.data.title || slug,
    date: parsed.data.date ? new Date(parsed.data.date) : null,
    summary: parsed.data.Summary || parsed.data.summary || "",
  }
  const mdContent = parsed.content

  return (
    <article className="container max-w-2xl py-10 mx-auto prose dark:prose-invert">
      <h1 className="text-3xl font-bold mb-4">{blogPost.title}</h1>
      {blogPost.date && (
        <div className="mb-6 text-sm text-muted-foreground">
          {blogPost.date.toLocaleDateString()}
        </div>
      )}
      <MarkdownRenderer content={mdContent} />
    </article>
  )
}
