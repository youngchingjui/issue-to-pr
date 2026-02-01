import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { makeFetchRepositoryReaderAdapter } from "@/lib/adapters/github/fetch/repository.reader"

export async function GET(request: Request) {
  const session = await auth()

  if (!session?.token?.access_token) {
    return new Response("Unauthorized", { status: 401 })
  }

  const fetchRepositoryReaderAdapter = makeFetchRepositoryReaderAdapter({
    token: session.token?.access_token,
  })

  const repositories =
    await fetchRepositoryReaderAdapter.listUserAccessibleRepoFullNames()

  if (!repositories.ok) {
    return NextResponse.json({ error: repositories.error }, { status: 500 })
  }

  return NextResponse.json(repositories.value)
}
