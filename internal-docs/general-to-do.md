### URL Structure & Routing

1. [ ] Evaluate URL structure options:
   - Current proposal: `/[username]/[repo]/issues/[issueId]/runs/[runId]`
   - Consider shorter alternatives for better UX
2. [ ] Create new routing structure in Next.js
3. [ ] Implement redirects from old `/workflow-runs/[traceId]` to new URL structure

### Page Layout & Components

1. [ ] Restructure workflow run page layout:
   - [ ] Add issue card at the top
   - [ ] Display final output/plan prominently below issue card
   - [ ] Show timeline of agent activities at the bottom
2. [ ] Create workflow-specific action components:
   - [ ] For `commentOnIssue`:
     - [ ] "Post as Comment" button
     - [ ] "Resolve Issue" button based on plan
   - [ ] For `resolveIssue`:
     - [ ] "Create Pull Request" button
     - [ ] Code edit preview component
3. [ ] Add navigation breadcrumbs for deep URL structure

### Workflow Functionality

1. [ ] Modify `commentOnIssue.ts` workflow:
   - [ ] Extract final output/plan for prominent display
   - [ ] Add functionality to post plan as comment
   - [ ] Implement "Resolve Issue" action
2. [ ] Enhance `resolveIssue.ts` workflow:
   - [ ] Add PR creation functionality
   - [ ] Implement code edit preview
3. [ ] Add support for multiple workflow runs per issue
4. [ ] Implement workflow run listing per issue

### Authentication & Authorization

1. [ ] Implement GitHub authentication
2. [ ] Create authorization rules:
   - [ ] Allow access to workflow initiators
   - [ ] Allow access to repository owners
3. [ ] Decision point: Define visibility rules for public repositories
   - [ ] Determine if workflow runs on public issues should be public
   - [ ] Implement visibility controls based on decision

### Data Storage & Management

1. [ ] Update workflow persistence service:
   - [ ] Add issue metadata to workflow runs
   - [ ] Store repository ownership information
   - [ ] Track workflow initiator information
2. [ ] Implement data structure for multiple runs per issue
3. [ ] Add indexes for efficient querying by:
   - [ ] Repository
   - [ ] Issue
   - [ ] User
   - [ ] Workflow type

### Cold Email Outreach

1. [ ] Generate sample issue analysis plans
2. [ ] Create repository owner notification system:
   - [ ] Design notification email template
   - [ ] Implement email sending functionality
   - [ ] Add links to view analysis with GitHub login
3. [ ] Add analytics tracking for:
   - [ ] Email open rates
   - [ ] GitHub login conversions
   - [ ] Workflow run views

### Performance & Optimization

1. [ ] Implement caching for:
   - [ ] Issue data
   - [ ] Workflow run results
   - [ ] Repository permissions
2. [ ] Add pagination for:
   - [ ] Multiple workflow runs
   - [ ] Timeline events
3. [ ] Optimize data loading with:
   - [ ] Server-side rendering where appropriate
   - [ ] Progressive loading for long timelines

### Landing Page Updates

1. [ ] Update pricing section to reflect cold email pricing:

   - [ ] Change from $1/month to "$10 per successfully merged PR"
   - [ ] Add "Flexible subscription plans available" option
   - [ ] Update pricing card to show both pay-per-PR and subscription options

2. [ ] Add social proof section:

   - [ ] Add "Already helping 9 open-source maintainers ship 40% faster"
   - [ ] Add urban-wheels as example case study
   - [ ] Create space for testimonials

3. [ ] Update value proposition in Hero:

   - [ ] Add "Cuts issue resolution time from hours to 2 minutes"
   - [ ] Emphasize maintaining codebase quality and style
   - [ ] Add mention of final PR review control

4. [ ] Enhance Features section:

   - [ ] Add emphasis on TypeScript/Next.js expertise
   - [ ] Add feature about maintaining existing codebase patterns
   - [ ] Add feature about production-ready code generation

5. [ ] Update GetStarted section:

   - [ ] Add option for free issue resolution plan
   - [ ] Add clearer CTA for booking demo/call
   - [ ] Add personalized support offering

6. [ ] Add Integrations section:

   - [ ] Highlight specific framework support (Next.js, TypeScript, etc.)
   - [ ] Show language/framework compatibility

7. [ ] Steps section updates:
   - [ ] Simplify the process steps to match cold email flow
   - [ ] Add emphasis on 2-minute resolution time
   - [ ] Add step about maintainer review process
