import Link from "next/link"

export default function Footer() {
  return (
    <footer className="py-6 px-4 backdrop-blur-sm text-stone-600 max-w-4xl mx-auto">
      <div className="w-full grid grid-cols-2">
        <div className="flex gap-4 justify-start">
          <p>
            &copy; {new Date().getFullYear()} Issue-to-PR. All rights reserved.
          </p>
        </div>
        <div className="flex gap-4 justify-end">
          <Link
            href="/blogs"
            className="hover:text-stone-900 transition-colors"
          >
            Blog
          </Link>
        </div>
      </div>
    </footer>
  )
}
