import { NextRequest, NextResponse } from "next/server"
import { TransformStream } from "web-streams-polyfill/ponyfill"; // Import polyfill for TransformStream

import {
  cleanup,
  getEventHistory,
  publishEvent,
  subscribeToEvents,
} from "@/lib/services/redis-stream"
import { BaseStreamEvent } from "@/lib/types/events"

import { authenticate } from "@/lib/middleware/authenticate";  // Middleware for authentication
import { rateLimit } from "@/lib/middleware/rateLimit";  // Middleware for rate limiting
import { logger } from "@/lib/utils/logger";  // Utility for logging

// Mark this route as dynamic
export const dynamic = "force-dynamic"

const bufferThreshold = 50;  // Maximum number of events in buffer before applying backpressure
const connectionTimeout = 60 * 1000;  // 1 minute timeout for idle connections

export async function GET(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    // Apply authentication
    await authenticate(request);

    // Apply rate limiting
    await rateLimit(request);

    // Setup encoder and buffer management
    const encoder = new TextEncoder();
    let buffer = [];

    const stream = new TransformStream({
      async start(controller) {
        logger.info(`Connection established for workflow: ${params.workflowId}`);

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "connection",
              data: "established",
            })}\n\n`
          )
        );

        try {
          const subscriber = await subscribeToEvents(params.workflowId);

          subscriber.on("message", (channel, message) => {
            try {
              const event = JSON.parse(message);
              buffer.push(event);

              // Maintain buffer within threshold to manage backpressure
              if (buffer.length > bufferThreshold) {
                controller.error(new Error("Buffer threshold exceeded"));
                buffer = [];
                return;
              }

              buffer.forEach(event => {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
                );
              });
              buffer = [];
            } catch (err) {
              logger.error(`Error handling message: ${err.message}`);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "error",
                    data: "Error processing message",
                  })}\n\n`
                )
              );
            }
          });

          await subscriber.subscribe(`workflow:${params.workflowId}`, () => {});

          const history = await getEventHistory(params.workflowId);
          for (const event of history) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            );
          }

          // Setup a timeout for closing idle connections
          const timeoutId = setTimeout(() => {
            logger.info(`Closing idle connection for workflow: ${params.workflowId}`);
            controller.terminate();
          }, connectionTimeout);

          request.signal.addEventListener("abort", async () => {
            clearTimeout(timeoutId);
            logger.info(`Client disconnected for workflow: ${params.workflowId}`);
            try {
              await subscriber.unsubscribe(`workflow:${params.workflowId}`);
              await subscriber.disconnect();
            } catch (err) {
              logger.error(`Error during cleanup: ${err.message}`);
            }
          });
        } catch (err) {
          logger.error(`Error setting up Redis connection: ${err.message}`);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                data: "Failed to establish Redis connection",
              })}\n\n`
            )
          );
          controller.terminate();
        }
      },
    });

    return new NextResponse(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "Cache-Control": "no-cache, no-transform",
        "Access-Control-Allow-Origin": "*",  // CORS header
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  } catch (err) {
    logger.error(`SSE handler error: ${err.message}`);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const event: BaseStreamEvent = await request.json();
    await publishEvent(params.workflowId, event);
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error(`Publishing event error: ${err.message}`);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    await cleanup(params.workflowId);
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error(`Cleanup error: ${err.message}`);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
