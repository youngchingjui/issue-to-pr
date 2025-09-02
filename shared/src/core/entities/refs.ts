import { z } from "zod"

export const branchPrefixSchema = z
  .string()
  .optional()
  .transform((str) => str?.trim()?.replace(/\/$/, ""))

export const baseBranchSlugSchema = z
  .string()
  .min(1, "Ref slug cannot be empty")
  .toLowerCase()
  .transform((input) =>
    input
      .replace(/[\s_/|]+/g, "-")
      // Remove invalid git ref characters
      .replace(/[~^:\\?*\[\]@{}]+/g, "")
      // Collapse multiple hyphens
      .replace(/-+/g, "-")
      // Trim hyphens and dots
      .replace(/^[.-]+|[.-]+$/g, "")
  )
  .default("new-branch")
