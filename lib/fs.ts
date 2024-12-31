// File system operations
import * as fs from "fs"
import * as path from "path"

export function createDirectoryTree(dir: string, indent: string = ""): string {
  let output = ""
  const files = fs.readdirSync(dir)

  files.forEach((file, index) => {
    const filePath = path.join(dir, file)
    const stats = fs.statSync(filePath)
    const isLast = index === files.length - 1

    // Skip node_modules
    if (file === "node_modules") {
      return
    }

    // Skip hidden folders and files
    if (file.startsWith(".")) {
      return
    }

    // Add file/directory to tree
    output += `${indent}${isLast ? "└── " : "├── "}${file}\n`

    // If it's a directory, recurse
    if (stats.isDirectory()) {
      output += createDirectoryTree(
        filePath,
        indent + (isLast ? "    " : "│   ")
      )
    }
  })

  return output
}
