# Auth Flow Technical Documentation

This document explains how authentication works in the application with visual diagrams.

## File Structure

```text
auth.ts                          # NextAuth config, JWT callback logic
lib/auth/
  cached-auth.ts                 # React cache() wrapper for request deduplication
  config.ts                      # Auth configuration constants
  refresh-token.ts               # GitHub token refresh (HTTP only)
```

## High-Level Overview

```mermaid
flowchart TB
    subgraph Browser
        Cookie[JWT Cookie]
    end

    subgraph "Next.js Server"
        Auth["auth()"]
        JWT[JWT Callback]
        Session[Session Callback]
    end

    subgraph External
        GitHub[GitHub OAuth API]
    end

    Cookie -->|"Sent with request"| Auth
    Auth -->|"Decode & validate"| JWT
    JWT -->|"If expired"| GitHub
    GitHub -->|"New tokens"| JWT
    JWT -->|"Build session"| Session
    Session -->|"Set-Cookie"| Cookie
```

## JWT Callback Decision Tree

This is the core auth logic in `auth.ts`. Every `auth()` call triggers this callback.

```mermaid
flowchart TD
    Start([auth called]) --> CheckTrigger{trigger param?}

    %% Sign-in flow
    CheckTrigger -->|"signIn or signUp"| SignIn[New sign-in flow]
    SignIn --> StoreTokens[Store access_token,<br/>refresh_token, expires_at,<br/>profile.login]
    StoreTokens --> ReturnNew([Return new token])

    %% Existing session flow
    CheckTrigger -->|"undefined"| CheckExpiry{Token expired?<br/>expires_at < now}

    CheckExpiry -->|No| Valid([Return existing token])

    CheckExpiry -->|Yes| Refresh[Call refreshToken]
    Refresh --> RefreshSuccess{Refresh<br/>succeeded?}

    RefreshSuccess -->|Yes| ReturnRefreshed([Return refreshed token])
    RefreshSuccess -->|No| RefreshError([Throw error])
```

## Token Refresh Flow

When a token expires, `lib/auth/refresh-token.ts` handles the refresh.

```mermaid
sequenceDiagram
    participant JWT as JWT Callback
    participant Refresh as refreshToken()
    participant GitHub as GitHub OAuth API

    JWT->>JWT: Check expires_at < now
    JWT->>Refresh: Token expired, call refresh

    Refresh->>Refresh: Validate refresh_token exists

    Refresh->>GitHub: POST /login/oauth/access_token
    Note over Refresh,GitHub: grant_type=refresh_token<br/>client_id, client_secret<br/>refresh_token

    alt Success
        GitHub-->>Refresh: New access_token, refresh_token, expires_in
        Refresh->>Refresh: Build new JWT with updated tokens
        Refresh-->>JWT: Return { token }
        JWT-->>JWT: Return new token to NextAuth
    else Error (bad_refresh_token)
        GitHub-->>Refresh: { error: "bad_refresh_token" }
        Refresh-->>JWT: Throw "please sign in again"
    end
```

## Page Load with React cache()

Multiple components call `auth()` during a single page render. React `cache()` deduplicates these calls.

```mermaid
sequenceDiagram
    participant Layout as layout.tsx
    participant Nav as Navigation.tsx
    participant Page as page.tsx
    participant Cache as React cache()
    participant Auth as auth()
    participant JWT as JWT Callback
    participant GitHub as GitHub API

    Note over Layout,GitHub: Page load starts

    par Concurrent calls
        Layout->>Cache: auth()
        Nav->>Cache: auth()
        Page->>Cache: auth()
    end

    Cache->>Cache: First call, no cached value

    Cache->>Auth: Single actual auth() call
    Auth->>JWT: JWT Callback

    alt Token valid
        JWT-->>Auth: Return token
    else Token expired
        JWT->>GitHub: Refresh token
        GitHub-->>JWT: New token
        JWT-->>Auth: Return new token
    end

    Auth-->>Cache: Session result

    Cache-->>Layout: Cached session
    Cache-->>Nav: Cached session
    Cache-->>Page: Cached session

    Note over Layout,GitHub: All 3 components get<br/>same session from 1 call
```

## Token States and Transitions

```mermaid
stateDiagram-v2
    [*] --> NoSession: First visit

    NoSession --> SigningIn: Click sign in
    SigningIn --> ValidToken: GitHub OAuth success
    SigningIn --> NoSession: OAuth cancelled/failed

    ValidToken --> ValidToken: auth() called,<br/>token still valid
    ValidToken --> ExpiredToken: Time passes,<br/>expires_at < now

    ExpiredToken --> ValidToken: Refresh succeeds
    ExpiredToken --> InvalidToken: Refresh fails<br/>(bad_refresh_token)

    InvalidToken --> NoSession: Clear session,<br/>redirect to sign-in

    ValidToken --> NoSession: User signs out
```

## Error Scenarios

```mermaid
flowchart TD
    subgraph "Error: No Refresh Token"
        E2[Token expired] --> E2Check{refresh_token<br/>exists?}
        E2Check -->|No| E2Error[Throw: No refresh token]
        E2Error --> E2Action[User must sign in again]
    end

    subgraph "Error: Bad Refresh Token"
        E3[Call GitHub API] --> E3Response{Response?}
        E3Response -->|error: bad_refresh_token| E3Error[Token revoked or expired]
        E3Error --> E3Action[User must sign in again]
    end

    subgraph "Error: GitHub API Down"
        E4[Call GitHub API] --> E4Response{Network error?}
        E4Response -->|Yes| E4Error[GitHub unreachable]
        E4Error --> E4Action[Retry or show error page]
    end
```

## Key Design Decisions

1. **No Redis for auth** - Simplifies deployment, works on Edge runtime
2. **React cache() for deduplication** - Multiple auth() calls in one request share result
3. **HTTP-only refresh** - Uses fetch(), works on Edge (no TCP sockets needed)
4. **JWT in cookie** - Stateless server, no session storage needed
5. **trigger param** - Uses AuthJS's `trigger` param ("signIn"/"signUp") to detect initial sign-in vs session check
