import path from "path";
import { z } from "zod";
import { deleteFile } from "@/lib/fs";
import { deleteFileInContainer } from "@/lib/actions/docker";
import { createTool } from "@/lib/tools/helper";
import { asRepoEnvironment, RepoEnvironment, Tool } from "@/lib/types";

const deleteFileParameters = z.object({
  relativePath: z.string().describe("The relative path of the file to delete"),
});
type DeleteFileParams = z.infer<typeof deleteFileParameters>;

async function fnHandler(
  env: RepoEnvironment,
  params: DeleteFileParams
): Promise<string> {
  const { relativePath } = params;
  if (env.kind === "host") {
    const fullPath = path.join(env.root, relativePath);
    await deleteFile(fullPath);
    return `File deleted successfully: ${relativePath}`;
  } else {
    const { exitCode, stderr } = await deleteFileInContainer({
      name: env.name,
      workdir: env.mount ?? "/workspace",
      relPath: relativePath,
    });
    if (exitCode !== 0) {
      throw new Error(`Failed to delete file: ${stderr}`);
    }
    return `File deleted successfully: ${relativePath}`;
  }
}

export function createDeleteFileTool(
  arg: string | RepoEnvironment
): Tool<typeof deleteFileParameters, string> {
  const env = asRepoEnvironment(arg);
  return createTool({
    name: "delete_file",
    description: "Deletes a file in the repository",
    schema: deleteFileParameters,
    handler: (params: DeleteFileParams) => fnHandler(env, params),
  });
}

