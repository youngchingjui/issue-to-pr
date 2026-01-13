# Issue-to-PR Documentation

## Overview

Issue-to-PR is a Next.js application that automates GitHub issue resolution using AI. This documentation provides information about the application's architecture, features, and implementation details.

## Documentation Structure

- `/api` - API documentation and endpoints
- `/components` - React component documentation
- `/guides` - User and developer guides
  - `/user-stories` - Feature-specific user stories and requirements
- `/setup` - Installation and configuration
- `/assets` - Diagrams and images ONLY (no documentation text)
  - Store only `.svg`, `.png`, `.jpg` files
  - For Mermaid diagrams, include them directly in markdown files using ```mermaid code blocks

## Quick Links

- [Getting Started](setup/getting-started.md)
- [Architecture Overview](guides/architecture.md)
- [Authentication Guide](guides/authentication.md)
- [AI Integration](guides/ai-integration.md)
- [API Reference](api/README.md)
- [Workflow Visualization](guides/user-stories/workflow-visualization.md)

## Core Features

1. GitHub Authentication (Github App)
2. Repository & Issue Management
3. AI-Powered Code Generation
4. Automated PR Creation
5. Pull Request Review
6. Workflow Visualization & Monitoring

For detailed information about each feature, please refer to the respective documentation sections.

## Feature Documentation

### Workflow Visualization

The application includes a powerful workflow visualization system that allows users to:

- Track and monitor AI agent activities in real-time
- Understand agent decision-making processes
- Explore relationships between different workflow steps
- Analyze workflow patterns and performance

For detailed requirements and user stories, see [Workflow Visualization](guides/user-stories/workflow-visualization.md).
