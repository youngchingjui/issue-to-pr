import path from "path"
import { z } from "zod"

/**
 * Zod schema for validating POSIX-style relative file paths.
 *
 * Validation rules (Linux-only runtime):
 * 1. Must be a non-empty UTF-8 string.
 * 2. Must be relative (no leading '/').
 * 3. Must not contain ".." segments (directory traversal).
 * 4. Must not contain NUL bytes or control characters.
 * 5. Must not contain empty ("//") or single-dot ("./") segments.
 *
 * All other Unicode codepoints — including spaces, emojis, and non-Latin scripts — are allowed
 * so that real-world filenames like "コンポーネント/🚀 launch plan.md" pass validation.
 */
export const relativePathSchema = z
  .string()
  // Disallow NUL byte and other ASCII control chars (0x00-0x1F, 0x7F)
  .min(1, { message: "Path cannot be empty" })
  // strip trailing slashes
  .transform((p) => p.replace(/\/+$/, ""))
  .refine((p) => !/[\0-\x1F\x7F]/.test(p), {
    message: "Path contains control characters or null bytes",
  })
  .refine((p) => !path.isAbsolute(p), {
    message: "Path must be relative (no leading '/')",
  })
  // Prevent directory traversal
  .refine((p) => !p.split("/").includes(".."), {
    message: "Path may not contain '..' segments",
  })
  // Reject empty ("//") or single-dot ("./") segments while allowing dotfiles like ".env"
  .refine(
    (p) => p.split("/").every((segment) => segment !== "" && segment !== "."),
    {
      message: "Path contains empty or '.' segments",
    }
  )
  .describe(
    "Relative path of the file to retrieve. Must be non-empty, be relative (no leading '/'), must not include '..' segments, must not contain control characters or null bytes, and must not contain empty ('//') or single-dot ('./') segments. Dotfiles such as '.env' are allowed."
  )

export type RelativePath = z.infer<typeof relativePathSchema>
