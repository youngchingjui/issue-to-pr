import crypto from "crypto"

if (!process.env.USER_SECRET_ENCRYPTION_KEY) {
  throw new Error("Missing USER_SECRET_ENCRYPTION_KEY environment variable.")
}

const ENCRYPTION_KEY = Buffer.from(process.env.USER_SECRET_ENCRYPTION_KEY, "base64") // Should be 32 bytes
if (ENCRYPTION_KEY.length !== 32) {
  throw new Error("USER_SECRET_ENCRYPTION_KEY must be a 32-byte base64-encoded string.")
}

const IV_LENGTH = 12 // AES-GCM nonce length

export function encrypt(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString("base64")
}

export function decrypt(cipherText: string): string {
  const buf = Buffer.from(cipherText, "base64")
  const iv = buf.subarray(0, IV_LENGTH)
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + 16)
  const encrypted = buf.subarray(IV_LENGTH + 16)
  const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])
  return decrypted.toString("utf8")
}
