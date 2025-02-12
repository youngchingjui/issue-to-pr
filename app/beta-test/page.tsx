import Image from "next/image"

export default function BetaTestPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-4xl font-bold tracking-tight">
        Issue To PR Beta Program
      </h1>

      <div className="prose prose-gray max-w-none">
        <p>
          Issue to PR is a tool that <em>automatically</em> resolves your Github
          Issues. When your Issue is created, our tool&apos;s multiple AI agents
          will:
        </p>

        <ol>
          <li>review the issue and your codebase</li>
          <li>generate a plan to resolve the issue</li>
        </ol>

        <figure className="my-8">
          <div className="overflow-hidden rounded-lg border bg-gray-50">
            <Image
              src="/images/beta-test/GitHub Issue CI CD Setup for EC2 Server.png"
              alt="Auto-generated plan for resolving issue"
              width={800}
              height={450}
              className="w-full"
            />
          </div>
          <figcaption className="mt-2 text-center text-sm text-gray-500">
            Auto-generated plan for resolving issue
          </figcaption>
        </figure>

        <figure className="my-8">
          <div className="overflow-hidden rounded-lg border bg-gray-50">
            <Image
              src="/images/beta-test/GitHub PR Tracking Function Screenshot.png"
              alt="Pull Request created 1 minute after issue created"
              width={800}
              height={450}
              className="w-full"
            />
          </div>
          <figcaption className="mt-2 text-center text-sm text-gray-500">
            Pull Request created 1 minute after issue created
          </figcaption>
        </figure>

        <ol start={3}>
          <li>commit code edits to a new branch</li>
          <li>and create a pull request</li>
        </ol>

        <p>
          Your developer can then review the code changes and manually merge the
          PR to production. This workflow dramatically decreases the Total Time
          to Resolution (TTR).
        </p>

        <p>
          We know how to achieve 100% accurate AI-generated PRs. But even while
          we&apos;re working towards that goal, we&apos;ve found this current
          implementation to already be very useful. The auto-generated plans and
          PRs dramatically speed up the time for our developers to debug and
          resolve the issues.
        </p>

        <h2 className="mt-12 text-2xl font-bold">Beta Program</h2>

        <p>
          We&apos;re looking for 10 beta testers who regularly use Github issues
          and believe Issue To PR could help them with their workflow. The beta
          program is free of charge, but you&apos;ll need to provide your own
          OpenAI API key. Estimated token costs per PR generated is around USD
          $1 / Pull Request, depending on the size of your codebase and
          complexity of the issue. We&apos;ll also be dramatically decreasing
          the token cost per run very soon.
        </p>

        <p>
          If you&apos;re interested in the beta program, please contact Ching at{" "}
          <a
            href="mailto:young.chingjui@youngandai.com"
            className="text-blue-600 hover:text-blue-800"
          >
            young.chingjui@youngandai.com
          </a>
        </p>

        <p>Thank you.</p>
      </div>
    </article>
  )
}
