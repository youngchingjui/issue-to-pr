# Observability with Langfuse and Error Telemetry

## Overview

Our system uses Langfuse's hosted service (cloud.langfuse.com) for monitoring and tracking all LLM operations. This integration provides comprehensive visibility into our AI operations and helps maintain system reliability.

In addition, we capture client- and server-side runtime errors in production and forward them to a configurable webhook for centralized error telemetry.

## Monitoring Features

### AI Operation Tracking

- Real-time monitoring of all LLM calls
- Performance metrics for each AI operation
- Token usage and cost tracking
- Success/failure rates across different operations
- Response quality assessment

### Trace Analysis

- End-to-end request tracing for each issue-to-PR conversion
- Visualization of AI decision chains
- Input/output correlation for debugging
- Historical data for operation patterns

### Cost Management

- Detailed token usage tracking per operation
- Cost allocation across different features
- Usage pattern analysis
- Trend monitoring for optimization

### Error Telemetry

- Client-side global capture of window errors and unhandled promise rejections
- Server-side global capture of uncaught exceptions and unhandled rejections
- Error forwarding to a webhook for storage and alerting (e.g., log collector, Slack, Sentry-compatible endpoint, or your own service)

## Integration Points

Langfuse is integrated at key points in our system:

1. Issue Analysis
   - Tracks initial issue processing
   - Monitors content understanding accuracy
2. Code Generation
   - Measures code generation performance
   - Tracks completion rates
3. PR Creation
   - Monitors end-to-end conversion success
   - Tracks overall system effectiveness

Error telemetry is integrated at the framework level:

- Client: a global ErrorListener component registers listeners for `error` and `unhandledrejection` and posts to `/api/telemetry/error`.
- Server: `instrumentation.ts` registers process-level handlers for `uncaughtException` and `unhandledRejection` in production.

## Configuration

Set the following environment variable in production to enable forwarding to your telemetry sink:

- ERROR_WEBHOOK_URL: HTTPS endpoint that receives JSON error payloads via POST.

If this variable is not set, errors are still logged to the server console.

Example payload posted to the webhook:

```
{
  "type": "server-error" | "unhandled-rejection" | "uncaught-exception",
  "message": "Error message",
  "stack": "...",
  "timestamp": "2024-08-31T12:34:56.789Z",
  "environment": "production",
  "service": "issue-to-pr",
  "url": "https://your.app/path",
  "meta": { "source": "client", "userAgent": "..." }
}
```

You can point this to a custom collector, Slack incoming webhook (with a middleware that reformats), or a lightweight service like Logtail, or a server that bridges to Sentry.

## Monitoring Dashboard

- Langfuse hosted dashboard for LLM operations
- Your webhook destination for error logs (e.g., your log management or alerting platform)

## Best Practices

1. Consistent Naming
   - Use descriptive labels and include relevant metadata when capturing errors manually
2. Error Handling
   - Always include stack traces when available
   - Tag critical vs non-critical failures via `severity` in the client payload if needed
3. Performance Optimization
   - Error telemetry is best-effort and non-blocking; do not await it in critical paths

## Troubleshooting

- No error logs show up
  - Ensure `ERROR_WEBHOOK_URL` is set in production
  - Verify the endpoint accepts POST JSON without authentication, or add the required headers
  - Check server logs for `[telemetry]` messages
- Too noisy in local development
  - Error forwarding runs only when `NODE_ENV=production`

## Additional Resources

- Langfuse Documentation: https://langfuse.com/docs
- Next.js Instrumentation: https://nextjs.org/docs/app/building-your-application/optimizing/open-telemetry

