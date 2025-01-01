import { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { checkIfLocalBranchExists } from "@/lib/git"

export async function POST(request: NextRequest) {
  const { branchName } = await request.json()

  const branchExists = await checkIfLocalBranchExists(branchName)

  return NextResponse.json({ branchExists })
}
