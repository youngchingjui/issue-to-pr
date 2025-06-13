import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { setUserOpenAIApiKey, getUserOpenAIApiKey } from "@/lib/neo4j/repositories/user"
import { encrypt, decrypt } from "@/lib/utils/encryption"

// Mask OpenAI API key (never reveal full key)
function maskApiKey(key: string): string {
  if (key.length <= 10) return key
  return `${key.slice(0, 5)}**********${key.slice(-4)}`
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Not authenticated. Please log in." },
      { status: 401 }
    )
  }
  const { apiKey } = await req.json()
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing API key" },
      { status: 400 }
    )
  }
  // Encrypt and store
  try {
    const encryptedKey = encrypt(apiKey)
    await setUserOpenAIApiKey(session.user.id, encryptedKey)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to store API key securely." },
      { status: 500 }
    )
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Not authenticated. Please log in." },
      { status: 401 }
    )
  }
  const encryptedKey = await getUserOpenAIApiKey(session.user.id)
  if (!encryptedKey) {
    return NextResponse.json({ hasKey: false })
  }
  let masked = ""
  try {
    const key = decrypt(encryptedKey)
    masked = maskApiKey(key)
  } catch {
    masked = "***invalid or corrupted***"
  }
  return NextResponse.json({ hasKey: true, masked })
}
