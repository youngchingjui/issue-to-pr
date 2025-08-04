// TEMPLATE: Example of how to structure application use cases
// Remove this file once the real AutoResolveIssueUseCase is implemented

import { Issue } from "../../domain/entities/Issue.template"
import { IIssueRepository } from "../../domain/repositories/IIssueRepository.template"
import {
  AutoResolveIssueRequest,
  AutoResolveIssueResponse,
} from "../dtos/AutoResolveIssue.template"

// ✅ Additional interfaces that use case depends on (defined in domain/application)
interface IPermissionService {
  checkCanResolveIssue(issueNumber: number, repoFullName: string): Promise<void>
}

interface IWorkflowOrchestrator {
  startAutoResolution(issue: Issue, jobId: string): Promise<void>
}

interface IEventPublisher {
  publish(event: any): Promise<void>
}

// ✅ Use case class contains orchestration logic only
export class AutoResolveIssueUseCase {
  constructor(
    // ✅ Depend on interfaces, not concrete implementations
    private readonly issueRepository: IIssueRepository,
    private readonly permissionService: IPermissionService,
    private readonly workflowOrchestrator: IWorkflowOrchestrator,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(
    request: AutoResolveIssueRequest
  ): Promise<AutoResolveIssueResponse> {
    // ✅ Input validation at application layer
    this.validateRequest(request)

    // ✅ Check permissions (cross-cutting concern)
    await this.permissionService.checkCanResolveIssue(
      request.issueNumber,
      request.repoFullName
    )

    // ✅ Get domain entity from repository
    const issue = await this.issueRepository.getByNumber(
      request.issueNumber,
      request.repoFullName
    )

    // ✅ Use domain entity methods for business logic
    if (!issue.canBeAutoResolved()) {
      throw new Error(
        `Issue #${issue.number} cannot be auto-resolved: ${this.getResolutionBlockers(issue)}`
      )
    }

    // ✅ Orchestrate workflow (but don't contain the workflow logic)
    await this.workflowOrchestrator.startAutoResolution(issue, request.jobId)

    // ✅ Publish domain events
    await this.eventPublisher.publish({
      type: "AutoResolutionStarted",
      issueNumber: issue.number,
      repoFullName: issue.repoFullName,
      jobId: request.jobId,
      timestamp: new Date(),
    })

    // ✅ Return application-layer DTO
    return new AutoResolveIssueResponse(request.jobId, issue.number, "started")
  }

  // ✅ Private helper methods for use case logic
  private validateRequest(request: AutoResolveIssueRequest): void {
    if (!request.issueNumber || request.issueNumber <= 0) {
      throw new Error("Invalid issue number")
    }

    if (!request.repoFullName || !request.repoFullName.includes("/")) {
      throw new Error("Invalid repository name")
    }

    if (!request.jobId) {
      throw new Error("Job ID is required")
    }
  }

  private getResolutionBlockers(issue: Issue): string {
    const blockers = []

    if (!issue.isOpen) {
      blockers.push("issue is not open")
    }

    // ✅ Use domain entity methods
    if (!issue.canBeAutoResolved()) {
      blockers.push("issue does not meet auto-resolution criteria")
    }

    return blockers.join(", ")
  }
}

// ✅ Example of how the use case would be called from API layer
/*
// In app/api/workflow/autoResolveIssue/route.ts
export async function POST(request: NextRequest) {
  // ✅ Dependency injection (could use a DI container)
  const useCase = new AutoResolveIssueUseCase(
    new Neo4jIssueRepository(),
    new GitHubPermissionService(),
    new WorkflowOrchestrator(),
    new EventPublisher()
  );
  
  try {
    const body = await request.json();
    const result = await useCase.execute(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error.message }, 
      { status: 400 }
    );
  }
}
*/
