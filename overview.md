# Codebase Overview

## Purpose

This appears to be a Next.js application that integrates with GitHub to help automate issue resolution and pull request creation. The main functionality seems to be:

1. Users can authenticate with GitHub
2. View their repositories and issues
3. Automatically generate code fixes for issues using AI (OpenAI/GPT)
4. Create branches, commit changes, and open pull requests automatically

## Key Structure

### Authentication

- Uses NextAuth.js for GitHub OAuth authentication
- Key file:

```1:38:auth.ts
import NextAuth, { DefaultSession, Session } from "next-auth"
import GithubProvider from "next-auth/providers/github"

// Allows us to attach accessToken to session.user with TypeScript
declare module "next-auth" {
  interface Session {
    user: {
      accessToken?: string
    } & DefaultSession["user"]
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GithubProvider({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      authorization: {
        params: {
          scope: "read:user repo",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      const user = (session as Session).user
      user.accessToken = token.accessToken as string
      return session
    },
  },
})
```

### Core Features

1. **Repository Management**:

- Shows list of user's GitHub repositories with pagination
- Allows repository selection

```1:53:components/RepositoryList.tsx
import { components } from "@octokit/openapi-types"
import Link from "next/link"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "./ui/pagination"

type GitHubRepository = components["schemas"]["full-repository"]

type RepositoryListProps = {
  repositories: GitHubRepository[]
  currentPage: number
  maxPage: number
}

export default async function RepositoryList({
  repositories,
  currentPage,
  maxPage,
}: RepositoryListProps) {
  const pages = Array.from({ length: maxPage }, (_, i) => i + 1)
  return (
    <ul className="space-y-4">
      {repositories.map((repo) => (
        <li key={repo.id} className="bg-white shadow rounded-lg p-4">
          <Link
            href={`/${repo.owner.login}/${repo.name}`}
            className="text-blue-600 hover:underline"
          >
            {repo.name}
          </Link>
        </li>
      ))}
      <Pagination>
        <PaginationContent>
          {pages.map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                href={`/?page=${page}`}
                isActive={page === currentPage}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
        </PaginationContent>
      </Pagination>
    </ul>
  )
}
```

2. **Issue Management**:

- Displays repository issues in a table format
- Provides actions for each issue

```1:67:components/IssueTable.tsx
import { getRepositoryIssues } from "../lib/github"
import { IssueActionsDropdown } from "./IssueActionsDropdown"

interface Props {
  username: string
  repo: string
}
export default async function IssueTable({ username, repo }: Props) {
  try {
    const issues = await getRepositoryIssues(username, repo)

    if (issues.length === 0) {
      return <p className="text-center py-4">No open issues found.</p>
    }

    return (
      <table className="min-w-full bg-white border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-4 border-b">Issue</th>
            <th className="py-2 px-4 border-b">Status</th>
            <th className="py-2 px-4 border-b">Associated Branch</th>
            <th className="py-2 px-4 border-b">Pull Request</th>
            <th className="py-2 px-4 border-b">Actions</th>
            <th className="py-2 px-4 border-b">More</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr key={issue.id} className="border-b">
              <td className="py-2 px-4">{issue.title}</td>
              <td className="py-2 px-4">{issue.state}</td>
              {/* <td className="py-2 px-4">{issue.associatedBranch || "N/A"}</td> */}
              {/* <td className="py-2 px-4">
                {issue.pullRequest ? (
                  <a
                    href={issue.pullRequest.url}
                    className="text-blue-500 hover:underline"
                  >
                    #{issue.pullRequest.number}
                  </a>
                ) : (
                  "No PR"
                )}
              </td> */}
              {/* <td className="py-2 px-4">
                {!issue.pullRequest && (
                  <CreatePullRequestButton issueNumber={issue.number} />
                )}
              </td> */}
              <td className="py-2 px-4">
                <IssueActionsDropdown issueId={issue.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  } catch (error) {
    return (
      <p className="text-center py-4 text-red-500">
        Error: {(error as Error).message}
      </p>
    )
  }
}
```

3. **AI Integration**:

- Uses OpenAI to analyze issues and generate code fixes
- Key file:

```15:33:lib/utils.ts
export async function generateNewContent(
  existingContent: string,
  instructions: string
) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const response = await openai.beta.chat.completions.parse({
    model: "gpt-4o",
    messages: [
      { role: "system", content: instructions },
      { role: "user", content: existingContent },
    ],
    response_format: zodResponseFormat(Code, "code"),
  })

  return response.choices[0].message.parsed
}
```

4. **Git Operations**:

- Handles git operations (creating branches, committing code, etc.)
- Key file:

```1:90:lib/git.ts
// Convenience methods for running git commands in node
// Returns promises for exec operations

import { exec } from "child_process"
import { promises as fs } from "fs"
import path from "path"

export async function checkIfGitExists(dir: string): Promise<boolean> {
  return await fs
    .access(path.join(dir, ".git"))
    .then(() => true)
    .catch(() => false)
}

export async function checkIfLocalBranchExists(
  branchName: string,
  cwd: string = null
): Promise<boolean> {
  // Lists all local branches and greps given branchName
  const command = `git branch | grep ${branchName}`
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      // grep returns exit code 1 when no matches are found
      // but other error codes indicate real errors
      if (error && error.code !== 1) {
        return reject(new Error(error.message))
      }
      if (stderr) {
        return reject(new Error(stderr))
      }
      return resolve(!!stdout && stdout.trim().length > 0)
    })
  })
}

export async function createBranch(
  branchName: string,
  cwd: string = null
): Promise<string> {
  const command = `git checkout -b ${branchName}`
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(error.message))
      }
      return resolve(stdout)
    })
  })
}
export async function checkoutBranch(
  branchName: string,
  cwd: string = null
): Promise<string> {
  // Checks out branch. Returns error if branch does not exist
  const command = `git checkout -q ${branchName}`
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(error.message))
      }
      if (stderr) {
        return reject(new Error(stderr))
      }
      return resolve(stdout)
    })
  })
}

export async function cloneRepo(
  repoUrl: string,
  dir: string = null
): Promise<string> {
  const command = `git clone ${repoUrl}${dir ? ` ${dir}` : ""}`
  return new Promise((resolve, reject) => {
    exec(command, { cwd: dir }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(error.message))
      }
      return resolve(stdout)
    })
  })
}

export async function getLocalFileContent(filePath: string): Promise<string> {
  // use os to get file content
  // Return error if file does not exist
  const fileContent = await fs.readFile(filePath, "utf8")
  return fileContent
}
```

## Key Technologies

1. **Frontend**:

- Next.js 14 (App Router)
- TailwindCSS for styling
- Shadcn/ui components

2. **Backend**:

- Next.js API routes
- Octokit for GitHub API integration
- OpenAI API for code generation
- Simple-git for Git operations

3. **Authentication**:

- NextAuth.js with GitHub provider

## Important Files

1. **API Routes**:

- `/api/resolve/route.ts`: Main endpoint for issue resolution
- `/api/issue/route.ts`: Handles issue-related operations
- `/api/auth/[...nextauth]/route.ts`: Authentication endpoints

2. **Components**:

- `IssueTable.tsx`: Main issue display component
- `IssueActionsDropdown.tsx`: Actions menu for each issue
- `CreatePullRequestButton.tsx`: Handles PR creation

3. **Configuration**:

- `next.config.js`: Next.js configuration
- `tailwind.config.ts`: Tailwind styling configuration
- `tsconfig.json`: TypeScript configuration

## Architecture

The application follows a typical Next.js App Router structure with:

- `/app`: Pages and API routes
- `/components`: Reusable React components
- `/lib`: Utility functions and core business logic
- `/public`: Static assets
