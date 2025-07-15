import { z } from "zod";
import fs from "fs";
import path from "path";

import { createDeleteFileTool } from "@/lib/tools/DeleteFileTool";

describe("DeleteFileTool", () => {
  const baseDir = path.join(__dirname, "tmp_deletefile");
  const filePath = path.join(baseDir, "file.txt");
  const dirPath = path.join(baseDir, "somedirectory");
  const fileInDir = path.join(dirPath, "file2.txt");

  beforeAll(async () => {
    await fs.promises.mkdir(baseDir, { recursive: true });
    await fs.promises.writeFile(filePath, "delete me\n", "utf-8");
    await fs.promises.mkdir(dirPath, { recursive: true });
    await fs.promises.writeFile(fileInDir, "delete me2\n", "utf-8");
  });

  afterAll(async () => {
    // cleanup test directories
    await fs.promises.rm(baseDir, { recursive: true, force: true });
  });

  it("deletes an existing file", async () => {
    const tool = createDeleteFileTool(baseDir);
    const relPath = path.relative(baseDir, filePath);
    await expect(tool.handler({ relativePath: relPath })).resolves.toMatch(
      /File deleted successfully/
    );
    // Verify file gone
    await expect(fs.promises.stat(filePath)).rejects.toThrow();
  });

  it("throws error when deleting a non-existent file", async () => {
    const tool = createDeleteFileTool(baseDir);
    await expect(
      tool.handler({ relativePath: "nope.txt" })
    ).rejects.toThrow(/File not found/);
  });

  it("refuses to delete a directory", async () => {
    const tool = createDeleteFileTool(baseDir);
    const relPath = path.relative(baseDir, dirPath);
    await expect(
      tool.handler({ relativePath: relPath })
    ).rejects.toThrow(/Refusing to delete directory/);
  });
});

