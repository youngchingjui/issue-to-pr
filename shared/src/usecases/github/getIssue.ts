import { err, type Result } from "@/shared/entities/result"
import type {
  GetIssueErrors,
  IssueDetails,
  IssueReaderPort,
  IssueRef,
} from "@/shared/ports/github/issue.reader"

export type GetIssueInput = IssueRef
export type GetIssueOutput = Result<IssueDetails, GetIssueErrors>

export interface GetIssueDeps {
  issueReader: IssueReaderPort
}

export function makeGetIssueUseCase({ issueReader }: GetIssueDeps) {
  return async function getIssue(
    input: GetIssueInput
  ): Promise<GetIssueOutput> {
    if (
      !input?.repoFullName ||
      !Number.isInteger(input.number) ||
      input.number <= 0
    ) {
      return err("RepoNotFound")
    }
    return await issueReader.getIssue(input)
  }
}
