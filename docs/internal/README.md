# Internal Documentation

This directory contains internal documentation that is not intended for end-users. This includes specifications, architectural decisions, and planning documents.

> **Before writing or editing specs, read [SPEC_GUIDELINES.md](./SPEC_GUIDELINES.md).**

## Directory Structure

- `/planning`: Contains implementation and architectural planning documents
  - `/implementation`: Detailed implementation plans and technical specifications
  - `/architecture`: Internal architectural decisions and design documents
- `/decisions`: Architecture Decision Records (ADRs) and other decision documentation
- `/roadmap`: Internal roadmap and future planning documents

## Guidelines for Internal Documentation

1. **Implementation Details**: All technical implementation specifics, including:

   - Detailed technical specifications
   - Implementation strategies
   - Technical debt considerations
   - Performance optimization plans

2. **Planning Documents**:

   - Sprint planning
   - Technical roadmaps
   - Implementation stages
   - Resource allocation

3. **Architecture Decisions**:
   - System design decisions
   - Technology choices
   - Trade-off analyses
   - Performance considerations

## Documentation Standards

1. Keep implementation details separate from user-facing documentation
2. Use clear, technical language appropriate for developers
3. Include relevant diagrams and technical specifications
4. Cross-reference related documents using relative paths
5. Keep documents focused and single-purpose
6. Update documents as implementation details change

## Security Note

This directory contains sensitive internal information. Ensure this documentation is:

- Not exposed in public repositories
- Not referenced from public documentation
- Only accessible to appropriate team members
