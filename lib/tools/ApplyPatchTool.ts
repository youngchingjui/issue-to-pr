import path from "path"
import { z } from "zod"

import { getFileContent } from "@/lib/fs"
import { applyPatch } from "@/lib/patch"
import { createTool } from "@/lib/tools/helper"

const APPLY_PATCH_TOOL_DESC = `
This tool applies UPDATE patches to a single file at a time. It does NOT support adding or deleting files, and does not use any bash or CLI commands. The input should be a V4A diff/patch string for a single file update only (no headers or multi-file patches).

Patch format:
- The input is a V4A patch string describing the changes to be made to the file.
- Each change block uses @@ markers for context, and lines starting with '-' are removed, '+' are added, and others are context.
- By default, show 3 lines of code immediately above and 3 lines immediately below each change. If a change is within 3 lines of a previous change, do NOT duplicate the first change's [context_after] lines in the second change's [context_before] lines.
- If 3 lines of context is insufficient to uniquely identify the snippet of code within the file, use the @@ operator to indicate the class or function to which the snippet belongs.
- No line numbers are used; context and @@ markers are used to identify the location.

Example input:
@@ class BaseClass
@@     def search():
    def search(self, arr, target):
        left, right = 0, len(arr) - 1
-        pass
+        raise NotImplementedError()
        # end of method

@@ class Subclass
@@     def search():
    def search(self, arr, target):
-        pass
+        raise NotImplementedError()
        # end of method

This tool will only update one file per call. To update multiple files, call this tool once for each file.
`

const applyPatchToolParameters = z.object({
  filePath: z
    .string()
    .describe("The relative path to the file to update (relative to baseDir)."),
  patch: z.string().describe("The V4A patch string to apply to the file."),
})

export const createApplyPatchTool = (baseDir: string) =>
  createTool({
    name: "apply_patch",
    description: APPLY_PATCH_TOOL_DESC,
    schema: applyPatchToolParameters,
    handler: async (params: { filePath: string; patch: string }) => {
      const { filePath, patch } = params
      const fullPath = path.join(baseDir, filePath)
      let fileContent = ""
      try {
        fileContent = await getFileContent(fullPath)
      } catch {
        return {
          status: "error",
          message: `File not found: ${fullPath}`,
        }
      }
      try {
        await applyPatch({ filePath: fullPath, patch }, fileContent)
        return {
          status: "ok",
          message: `Patch successfully applied to ${fullPath}.`,
        }
      } catch (e: unknown) {
        return {
          status: "error",
          message: e instanceof Error ? e.message : "Failed to apply patch.",
        }
      }
    },
  })
