# Authentication System Specification

## Current System Overview

The application currently uses NextAuth (auth.js v5) for authentication with GitHub App OAuth integration. Users sign in once with GitHub, receiving OAuth tokens that expire and require periodic refresh.

### Current Pain Points

**Slow Token Refresh**
When access tokens expire, the system must contact GitHub's OAuth endpoint to refresh them. This happens during page loads when multiple components simultaneously call `auth()`, causing delays that users perceive as poor performance.

**Concurrent Refresh Complexity**
Multiple components on a single page may each call `auth()` independently. If the token is expired, each call attempts to refresh it. Without coordination, this means multiple simultaneous requests to GitHub's OAuth server. Only the first request succeeds; others fail and must retry.

**Redis Dependency**
To prevent concurrent refresh attempts, the system uses Redis as a distributed lock. One process acquires the lock, refreshes the token, stores it in Redis, and releases the lock. Other processes poll Redis waiting for the refreshed token. This adds network latency and operational complexity.

**Re-authentication Friction**
When refresh tokens become invalid (rare but happens), users must sign in again completely. The system doesn't gracefully guide them through this.

## User Requirements

### Seamless Access

After initial sign-in, users should never need to re-authenticate unless security requires it. The system handles token expiry invisibly in the background.

### Fast Page Loads

Authentication checks should add minimal delay to page rendering. Most page loads should use cached credentials rather than making network calls.

### Concurrent Safety

When 10 components on a page each need authentication info, the system should coordinate them efficiently rather than making 10 separate authentication calls or 10 refresh attempts.

### Future Multi-Provider Support

The architecture should accommodate adding Google OAuth and email/password authentication alongside GitHub, allowing users to link multiple accounts to one profile.

## Proposed Architecture

### Smart Caching Strategy

**Session Caching**
Store the authenticated session in a secure, HTTP-only cookie. The cookie serves as the primary source of auth state. Components read from this cookie rather than making repeated database or API calls.

**Proactive Refresh**
Before tokens expire, automatically refresh them in the background. If a token expires in 60 minutes, refresh it at 50 minutes. Users never experience expired-token delays.

**Process-Level Deduplication**
Within a single server process, maintain an in-memory cache of the current session. When multiple components call `auth()` within milliseconds of each other, they all receive the same cached response. Cache validity: 5 seconds.

### Concurrency Control

**Request-Level Deduplication**
Within a single HTTP request, React `cache()` ensures multiple components calling `auth()` share the same result. This prevents redundant JWT decoding and refresh checks within a single page render.

**No Redis Dependency**
The auth system operates without Redis. Each HTTP request handles its own token refresh if needed. React `cache()` ensures only one refresh per request.

### Graceful Failure Handling

**Clear Error States**
When refresh fails due to an invalid refresh token, immediately clear all cached tokens and redirect the user to a friendly re-authentication page explaining what happened.

**No External Dependencies**
The auth system operates entirely without external dependencies like Redis. Each server process handles token refresh independently using in-process single-flight coordination.

**Session Fixation Prevention**
When users sign in or refresh tokens, rotate session identifiers to prevent session hijacking.

### Multi-Provider Readiness

**Provider-Agnostic Token Storage**
Store tokens in a structure that accommodates multiple providers.

**Unified Session Interface**
Components calling `auth()` receive a consistent session object regardless of whether the user authenticated via GitHub, Google, or email. The session includes a `provider` field but otherwise looks the same.

**Account Linking**
Users can link multiple OAuth providers to a single profile. The system maintains separate token sets for each provider but associates them with one user identity.

## Success Criteria

**Performance**

- Page loads requiring auth should add no more than 50ms of latency in the 95th percentile
- Concurrent auth calls on a single page should result in at most one network refresh operation
- Token refresh should happen in the background before expiry, not blocking user actions

**Reliability**

- System remains fully functional even if Redis is temporarily unavailable
- Invalid refresh tokens trigger graceful re-authentication flow, not error pages
- No auth-related race conditions under high concurrency

**Developer Experience**

- Components call `auth()` and receive valid tokens; they don't need to worry about expiry or refresh
- Adding a new OAuth provider requires minimal changes to existing code
- Auth logic is concentrated in one place, not scattered across the application

**User Experience**

- After initial sign-in, users access the application immediately without delays
- Token expiry is invisible; users never see "please sign in again" unless truly necessary
- Re-authentication flows are clear and explain why they're needed

## Non-Goals

**Client-Side Token Management**
Refresh tokens remain strictly server-side. Clients never see or handle refresh tokens, only access tokens when necessary for API calls.

**Complex Session State Machines**
Avoid over-engineering. The system handles three states: authenticated with valid token, authenticated with expired token (refresh), and unauthenticated (sign in). No intermediate states.

**Real-Time Token Revocation**
When users revoke access via GitHub settings, the system detects this on the next refresh attempt and gracefully handles it. Immediate revocation detection is not required.

## Migration Considerations

**Backward Compatibility**
During migration, support both old and new token formats. Gradually migrate users by treating old tokens as expired and refreshing them using the new system.

**Zero-Downtime Deployment**
The new system should deploy without requiring all users to re-authenticate. Existing sessions remain valid and convert to the new format on next use.

**Monitoring**
Instrument auth flows to measure refresh frequency, cache hit rates, and failed refresh attempts. This data informs future optimizations.
