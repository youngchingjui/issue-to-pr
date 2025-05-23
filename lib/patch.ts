/*
Sample V4A patch string (for a single file):

"""
@@ class MyClass
@@     def my_method(self):
context_before_line_1
context_before_line_2
-    old_code_line_1
-    old_code_line_2
+    new_code_line_1
+    new_code_line_2
context_after_line_1
context_after_line_2

@@ class MyClass
@@     def another_method(self):
context_before_line_1
context_before_line_2
-    old_code_line
+    new_code_line
+    new_code_line_2
+    new_code_line_3
context_in_between_lines
context_in_between_lines_2
+    new_code_line_4
context_after_line_1
context_after_line_2
"""

// Each change block is separated by @@ markers and context lines.
// Lines starting with '-' are removed, '+' are added, and others are context.
*/

import { writeFile } from "@/lib/fs"

// Basic patch application logic for V4A-style patches (single file)

export class PatchApplyError extends Error {}
export class FileAlreadyExistsError extends PatchApplyError {}
export class FileNotFoundError extends PatchApplyError {}
export class ContextNotFoundError extends PatchApplyError {}

export interface ApplyPatchParams {
  filePath: string
  patch: string // For update, the V4A patch string (with @@, context, etc.)
}

export interface PatchChange {
  markers: string[] // @@ markers
  contextBefore: string[]
  oldCode?: string // for update
  newCode?: string // for add/update
  contextAfter: string[]
}

// Parse the patch string into a list of PatchChange objects
export function parsePatchString(patch: string): PatchChange[] {
  // Remove the file header and any leading/trailing whitespace
  const lines = patch
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0 && !line.startsWith("***"))

  const changes: PatchChange[] = []
  let i = 0
  while (i < lines.length) {
    // Collect @@ markers
    const markers: string[] = []
    while (i < lines.length && lines[i].startsWith("@@")) {
      markers.push(lines[i])
      i++
    }
    // Collect contextBefore, oldCode, newCode, contextAfter
    const contextBefore: string[] = []
    const oldCode: string[] = []
    const newCode: string[] = []
    const contextAfter: string[] = []
    let inChange = false
    // Read until next @@ or end
    while (i < lines.length && !lines[i].startsWith("@@")) {
      const line = lines[i]
      if (line.startsWith("-")) {
        inChange = true
        oldCode.push(line.slice(1).trimStart())
      } else if (line.startsWith("+")) {
        inChange = true
        newCode.push(line.slice(1).trimStart())
      } else if (!inChange) {
        contextBefore.push(line)
      } else {
        contextAfter.push(line)
      }
      i++
    }
    changes.push({
      markers,
      contextBefore,
      oldCode: oldCode.length > 0 ? oldCode.join("\n") : undefined,
      newCode: newCode.length > 0 ? newCode.join("\n") : undefined,
      contextAfter,
    })
  }
  return changes
}

// Helper for fuzzy matching of line arrays
function fuzzyFindContext(
  contentLines: string[],
  context: string[],
  start: number
): { index: number; fuzz: number } {
  if (context.length === 0) return { index: start, fuzz: 0 }
  // 1. Exact match
  for (let i = start; i <= contentLines.length - context.length; i++) {
    let match = true
    for (let j = 0; j < context.length; j++) {
      if (contentLines[i + j] !== context[j]) {
        match = false
        break
      }
    }
    if (match) return { index: i, fuzz: 0 }
  }
  // 2. Ignore trailing whitespace
  for (let i = start; i <= contentLines.length - context.length; i++) {
    let match = true
    for (let j = 0; j < context.length; j++) {
      if (
        contentLines[i + j].replace(/\s+$/, "") !==
        context[j].replace(/\s+$/, "")
      ) {
        match = false
        break
      }
    }
    if (match) return { index: i, fuzz: 1 }
  }
  // 3. Ignore all leading/trailing whitespace
  for (let i = start; i <= contentLines.length - context.length; i++) {
    let match = true
    for (let j = 0; j < context.length; j++) {
      if (contentLines[i + j].trim() !== context[j].trim()) {
        match = false
        break
      }
    }
    if (match) return { index: i, fuzz: 100 }
  }
  return { index: -1, fuzz: 0 }
}

// Helper to get leading whitespace from a line
function getLeadingWhitespace(line: string): string {
  const match = line.match(/^(\s*)/)
  return match ? match[1] : ""
}

// Helper to get minimum indentation from a set of lines (ignoring blank lines)
function getMinIndent(lines: string[]): number {
  let minIndent = Infinity
  for (const line of lines) {
    if (line.trim() === "") continue
    const match = line.match(/^(\s*)/)
    if (match) {
      minIndent = Math.min(minIndent, match[1].length)
    }
  }
  return minIndent === Infinity ? 0 : minIndent
}

// Apply a list of PatchChange objects to the file content, sequentially
export function applyPatchChanges(
  fileContent: string,
  changes: PatchChange[]
): string {
  let contentLines = fileContent.split("\n")

  for (const change of changes) {
    // Find the region using markers (if any)
    let searchStart = 0
    if (change.markers.length > 0) {
      for (const marker of change.markers) {
        // Find the first line that matches the marker (ignoring leading/trailing spaces)
        const markerText = marker.replace(/^@@\s*/, "").trim()
        const idx = contentLines.findIndex(
          (line, i) => i >= searchStart && line.trim() === markerText
        )
        if (idx === -1) {
          throw new ContextNotFoundError(
            `Could not find marker '${markerText}' in file content.`
          )
        }
        searchStart = idx + 1 // Start next search after this marker
      }
    }

    // Now, search for the contextBefore block after the last marker (fuzzy)
    const beforeLen = change.contextBefore.length
    const { index: contextIdx } = fuzzyFindContext(
      contentLines,
      change.contextBefore,
      searchStart
    )
    if (contextIdx === -1) {
      throw new ContextNotFoundError(
        `Could not find contextBefore block after markers (fuzzy): ${change.contextBefore.join("\n")}`
      )
    }

    // The patch replaces lines after contextBefore, up to contextAfter
    const replaceStart = contextIdx + beforeLen
    let replaceEnd = replaceStart
    // If oldCode is present, match it fuzzily
    if (change.oldCode) {
      const oldLines = change.oldCode.split("\n")
      const { index: oldIdx } = fuzzyFindContext(
        contentLines,
        oldLines,
        replaceStart
      )
      if (oldIdx !== replaceStart) {
        throw new ContextNotFoundError(
          `Old code does not match at expected location (fuzzy). Expected: '${oldLines.join("\n")}', Found: '${contentLines.slice(replaceStart, replaceStart + oldLines.length).join("\n")}'`
        )
      }
      replaceEnd = replaceStart + oldLines.length
    }
    // Optionally, check contextAfter (fuzzy)
    if (change.contextAfter.length > 0) {
      const { index: afterIdx } = fuzzyFindContext(
        contentLines,
        change.contextAfter,
        replaceEnd
      )
      if (afterIdx !== replaceEnd) {
        throw new ContextNotFoundError(
          `Could not find contextAfter block after patch (fuzzy): ${change.contextAfter.join("\n")}`
        )
      }
    }
    // --- Indentation logic for new lines ---
    let baseIndent = ""
    if (change.contextBefore.length > 0) {
      baseIndent = getLeadingWhitespace(
        change.contextBefore[change.contextBefore.length - 1]
      )
    } else if (change.contextAfter.length > 0) {
      baseIndent = getLeadingWhitespace(change.contextAfter[0])
    }
    // Compute minimum indentation in patch newCode block
    let newLines: string[] = []
    if (change.newCode) {
      const patchLines = change.newCode.split("\n")
      const minIndent = getMinIndent(patchLines)
      newLines = patchLines.map((line) => {
        if (line.trim() === "") return "" // preserve blank lines
        // Remove minIndent from start, then prepend baseIndent
        return baseIndent + line.slice(minIndent)
      })
    }
    contentLines = [
      ...contentLines.slice(0, replaceStart),
      ...newLines,
      ...contentLines.slice(replaceEnd),
    ]
  }
  return contentLines.join("\n")
}

// Main handler for applying a patch to a file (in-memory)
export async function applyPatch(
  params: ApplyPatchParams,
  fileContent: string
): Promise<{
  status: "ok"
  filePath: string
  details: { newContent: string }
}> {
  const { filePath, patch } = params

  const changes = parsePatchString(patch)
  const newContent = applyPatchChanges(fileContent, changes)
  await writeFile(filePath, newContent)
  return { status: "ok", filePath, details: { newContent } }
}
