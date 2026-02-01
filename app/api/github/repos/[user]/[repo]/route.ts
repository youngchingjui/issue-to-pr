import { auth } from "@/auth"
import { makeFetchRepositoryReaderAdapter } from "@/lib/adapters/github/fetch/repository.reader"
import { GetRepoRequestSchema } from "@/lib/types/api/github"

export async function GET(
  request: Request,
  context: { params: { user: string; repo: string } }
) {
  const { params } = context

  const parsed = GetRepoRequestSchema.safeParse(params)
  if (!parsed.success) {
    return new Response("Bad Request, invalid path parameters", {
      status: 400,
    })
  }

  const session = await auth()

  if (!session?.token?.access_token) {
    return new Response("Unauthorized", { status: 401 })
  }

  const fetchRepositoryReaderAdapter = makeFetchRepositoryReaderAdapter({
    token: session.token?.access_token,
  })

  const repoDetails = await fetchRepositoryReaderAdapter.getRepo({
    fullName: parsed.data.fullName,
  })

  if (!repoDetails.ok) {
    return new Response(JSON.stringify({ error: repoDetails.error }), {
      status: 500,
    })
  }

  return new Response(JSON.stringify(repoDetails.value), { status: 200 })
}
