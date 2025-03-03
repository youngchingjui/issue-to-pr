const BLOG_URL =
  "https://lavish-tugboat-5ca.notion.site/ebd/1abe6ee78623807cacc8f2cafb6b16cb"

export default function BlogPage() {
  return (
    <div style={{ height: "100vh" }}>
      <iframe
        src={BLOG_URL}
        width="100%"
        height="100%"
        style={{ border: "none" }}
        allowFullScreen
      />
    </div>
  )
}
