# OAuth App to GitHub App Migration

## Problem

Users migrating from GitHub OAuth App to GitHub App authentication were experiencing errors because old OAuth App tokens were still stored in their sessions and Redis cache, but these tokens don't work with the new GitHub App setup.

## Solution

Added comprehensive validation to detect and invalidate old OAuth App tokens at multiple levels:

### 1. JWT Callback Validation (`auth.ts`)

- Added check for `authMethod !== "github-app"` before returning existing tokens
- Throws error to force re-authentication for old OAuth App tokens

### 2. Token Refresh Validation (`lib/utils/auth.ts`)

- Updated `refreshTokenWithLock` to use GitHub App credentials instead of old OAuth App credentials
- Added validation before attempting token refresh
- Added validation for cached tokens retrieved from Redis
- Ensures refreshed tokens maintain proper `authMethod` field

### 3. Redis Cache Cleanup

- All cached token retrievals now validate `authMethod` before returning tokens
- Old OAuth App tokens are automatically removed from Redis when encountered
- Added cleanup script to bulk remove existing old tokens

## Environment Variables

Ensure these GitHub App environment variables are set:

- `GITHUB_APP_CLIENT_ID` (used instead of old `AUTH_GITHUB_ID`)
- `GITHUB_APP_CLIENT_SECRET` (used instead of old `AUTH_GITHUB_SECRET`)

## Deployment Steps

1. Deploy the auth changes
2. Run the cleanup script: `npx tsx scripts/cleanup-old-tokens.ts`
3. Monitor logs for users being prompted to re-authenticate

## User Experience

- Users with old OAuth App tokens will be automatically signed out
- They'll see a standard "please sign in again" flow
- New sessions will use proper GitHub App authentication
- No manual intervention required from users

## Expected Logs

- "Invalidating old OAuth App token, forcing re-authentication"
- "Cannot refresh old OAuth App token, invalidating"
- "Cached token is from old OAuth App, removing from cache"

This is a one-time migration that will resolve itself as users sign in with the new GitHub App flow.
