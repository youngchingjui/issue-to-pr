import Image from "next/image"

export default function ContributePublic() {
  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Contribute to Public Repositories
          </h2>
          <p className="text-lg mb-8 text-muted-foreground">
            Help improve open source projects by resolving issues and reviewing
            pull requests. Simply paste a GitHub URL and get started.
          </p>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-3">Issues</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Generate resolution plans automatically</li>
                <li>Resolve issues with AI assistance</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Pull Requests</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Review PRs thoroughly and quickly</li>
                <li>Identify PR goals and impact</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-lg overflow-hidden shadow-lg">
            <Image
              src="/images/contribute-public.png"
              alt="Contribute to Public Repositories Interface"
              width={800}
              height={600}
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
