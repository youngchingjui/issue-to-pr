// TODO: Move to shared/src/core/entities/refs.ts

import { z } from "zod"

export const branchPrefixSchema = z
  .string()
  .optional()
  .transform((str) => str?.trim()?.replace(/\/$/, ""))

export const baseBranchSlugSchema = z
  .string()
  .min(1, "Ref slug cannot be empty")
  .toLowerCase()
  .transform((input) => {
    let output = input
      // Normalize separators to hyphen
      .replace(/[\s_/|]+/g, "-")
      // Remove ASCII control characters
      .replace(/[\x00-\x1F\x7F]+/g, "")
      // Remove invalid git ref characters (allowed: '!' stays)
      .replace(/[~^:\?*\\\[]+/g, "")
      // Disallow the literal sequence "@{"
      .replace(/@\{/g, "at-")
      // Disallow sequences like ".."
      .replace(/\.{2,}/g, "-")
      // Remove trailing ".lock"
      .replace(/(?:\.lock)+$/g, "")
      // Collapse multiple hyphens
      .replace(/-+/g, "-")
      // Trim leading/trailing hyphens, dots, and slashes
      .replace(/^[./-]+|[./-]+$/g, "")

    // A single '@' by itself is not allowed
    if (output === "@") {
      output = "at"
    }

    return output
  })
  .default("new-branch")
