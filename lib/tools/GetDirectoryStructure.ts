import { zodFunction } from "openai/helpers/zod"
import { z } from "zod"

import { createDirectoryTree } from "@/lib/fs"
import { Tool } from "@/lib/types"

const getDirectoryStructureParameters = z.object({})

export default class GetDirectoryStructureTool
  implements Tool<typeof getDirectoryStructureParameters>
{
  parameters = getDirectoryStructureParameters
  tool = zodFunction({
    name: "get_directory_structure",
    parameters: getDirectoryStructureParameters,
    description: "Get the directory structure of the repository",
  })

  baseDir: string

  constructor(baseDir: string) {
    this.baseDir = baseDir
  }

  async handler() {
    const tree = await createDirectoryTree(this.baseDir)
    return tree.join("\n")
  }
}
