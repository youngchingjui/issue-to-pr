import * as fs from "fs/promises"

// TODO: Handle errors
export async function getPrivateKeyFromFile(path: string): Promise<string> {
  const privateKey = await fs.readFile(path, "utf8")
  return privateKey
}
