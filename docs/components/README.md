# Component Documentation

This section describes individual React components used throughout the application. It also covers tools and utilities that support component development.

## Patch Format and `createApplyPatchTool`

The application ships with a specialized patch utility for applying context-based diffs to files. This is useful when line numbers are unreliable, such as when code has moved but still matches surrounding context.

Patches use a **V4A** style format where each change block is prefixed with `@@` markers indicating the surrounding scope (for example a class or function name). Within each block:

- Lines beginning with `-` are removed.
- Lines beginning with `+` are added.
- All other lines provide context before and after the change.

### Example Patch

```text
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
```

This example mirrors the sample in [`lib/patch.ts`](../../lib/patch.ts) and demonstrates how changes are described without using line numbers.

### `createApplyPatchTool`

The [`createApplyPatchTool`](../../lib/tools/ApplyPatchTool.ts) helper exposes a tool named `apply_patch` that takes a file path and a V4A patch string. It parses the patch, locates the context within the file, and updates the file content accordingly. Only a single file is modified per invocation, allowing agents to apply incremental changes reliably.

**Use case:** when agents or other tools generate diffs without explicit line numbers, this format allows applying the patch by matching context blocks. It is especially helpful when the target file may have shifted lines due to other edits.

