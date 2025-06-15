import { repoFullNameSchema } from "@/lib/types"

/**
 * Unit tests for repoFullNameSchema (validates <username>/<repoName> GitHub repo slug)
 */
describe("repoFullNameSchema", () => {
  it("accepts typical valid full names", () => {
    expect(() => repoFullNameSchema.parse("octocat/hello-world")).not.toThrow()
    expect(() => repoFullNameSchema.parse("user123/repo-name_2")).not.toThrow()
    expect(() => repoFullNameSchema.parse("A.B-c_D/E.f-g_H")).not.toThrow()
    expect(() => repoFullNameSchema.parse("a12345/_.-12345")).not.toThrow()
  })

  it("rejects missing slash", () => {
    expect(() => repoFullNameSchema.parse("octocathe-lloworld")).toThrow()
    expect(() => repoFullNameSchema.parse("octocat")).toThrow()
  })

  it("rejects extra slashes", () => {
    expect(() => repoFullNameSchema.parse("user/repo/extra")).toThrow()
    expect(() => repoFullNameSchema.parse("user//repo")).toThrow()
    expect(() => repoFullNameSchema.parse("/user/repo")).toThrow()
    expect(() => repoFullNameSchema.parse("user/repo/")).toThrow()
  })

  it("rejects forbidden characters", () => {
    expect(() => repoFullNameSchema.parse("octocat!/helloworld")).toThrow()
    expect(() => repoFullNameSchema.parse("octocat/hello world")).toThrow()
    expect(() => repoFullNameSchema.parse("octo cat/hello-world")).toThrow()
    expect(() => repoFullNameSchema.parse("octocat@/hello#")).toThrow()
    expect(() => repoFullNameSchema.parse("octocat/你好")).toThrow()
  })

  it("rejects empty or incomplete", () => {
    expect(() => repoFullNameSchema.parse("")).toThrow()
    expect(() => repoFullNameSchema.parse("/")).toThrow()
    expect(() => repoFullNameSchema.parse("user/")).toThrow()
    expect(() => repoFullNameSchema.parse("/repo")).toThrow()
  })
})
