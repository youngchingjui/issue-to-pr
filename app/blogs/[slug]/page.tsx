import path from "path"
import { notFound } from "next/navigation"
import { getFileContent } from "@/lib/fs"
import matter from "gray-matter"
import MarkdownRenderer from "@/components/blog/MarkdownRenderer"

interface BlogPageParams {
  params: { slug: string }
}

export default async function BlogPostPage({ params }: BlogPageParams) {
  const { slug } = params
  const blogDir = path.join(process.cwd(), "blogs")
  const file = path.join(blogDir, `${slug}.md`)

  let mdContent: string
  let data: any = {}

  try {
    const fileContent = await getFileContent(file)
    const parsed = matter(fileContent)
    mdContent = parsed.content
    data = parsed.data || {}
  } catch (err) {
    notFound()
  }

  const title = data.title || slug
  const date = data.date

  return (
    <article className="container max-w-2xl py-10 mx-auto prose dark:prose-invert">
      <h1 className="text-3xl font-bold mb-4">{title}</h1>
      {date && <div className="mb-6 text-sm text-muted-foreground">{date}</div>}
      <MarkdownRenderer content={mdContent} />
    </article>
  )
}
