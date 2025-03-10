import { Github, Linkedin, Mail, Twitter } from "lucide-react"
import Link from "next/link"

const SOCIAL_LINKS = [
  {
    href: "https://x.com/youngchingjui",
    label: "Twitter",
    icon: Twitter,
  },
  {
    href: "https://github.com/youngchingjui",
    label: "GitHub",
    icon: Github,
  },
  {
    href: "https://www.linkedin.com/in/chingjuiyoung/",
    label: "LinkedIn",
    icon: Linkedin,
  },
  {
    href: "mailto:young.chingjui@youngandai.com",
    label: "Email",
    icon: Mail,
  },
]

const SocialLink = ({ href, label, icon: Icon }) => (
  <Link
    href={href}
    aria-label={label}
    target="_blank"
    className="w-10 h-10 border border-stone-300 rounded-md flex items-center justify-center hover:bg-stone-100 hover:text-black transition-colors"
  >
    <Icon size={20} />
  </Link>
)

export default function Footer() {
  return (
    <footer className="py-8 pt-36 px-4 text-stone-100 bg-black mx-auto flex flex-col items-center">
      <div className="w-full grid md:grid-cols-2 grid-cols-1 gap-8 items-start max-w-[1200px]">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold text-stone-200">Issue To PR</h2>
          <p className="max-w-md text-stone-200">
            This tool reduces manual effort, letting you focus on coding rather
            than administrative tasks.
          </p>
        </div>
        <div className="flex flex-col md:items-end items-start gap-4">
          <p className="text-lg font-medium">Contact us:</p>
          <div className="flex gap-4">
            {SOCIAL_LINKS.map((link) => (
              <SocialLink key={link.label} {...link} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-16 text-center text-stone-200">
        <p>
          &copy; {new Date().getFullYear()} Issue To PR. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
