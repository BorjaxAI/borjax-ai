import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { tokenCheckMiddleware } from "../middleware/token-check";

const chat = new Hono();
const AI_URL = () => process.env.AI_SERVICE_URL ?? "http://ai:8000";

chat.use("*", authMiddleware);
chat.use("*", tokenCheckMiddleware);

/**
 * POST /v1/chat/send
 * Proxies to FastAPI with SSE passthrough for streaming responses.
 */
chat.post("/send", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const body = await c.req.text();

  const upstream = await fetch(`${AI_URL()}/chat/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
      Accept: "text/event-stream",
    },
    body,
  });

  if (!upstream.ok && !upstream.headers.get("content-type")?.includes("text/event-stream")) {
    const err = await upstream.text();
    return new Response(err, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Pass through the SSE stream
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});

/**
 * GET /v1/chat/conversations
 */
chat.get("/conversations", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const url = new URL(`${AI_URL()}/chat/conversations`);
  const page = c.req.query("page");
  const limit = c.req.query("limit");
  if (page) url.searchParams.set("page", page);
  if (limit) url.searchParams.set("limit", limit);

  const res = await fetch(url.toString(), {
    headers: { Authorization: authHeader },
  });
  const data = await res.text();
  return new Response(data, { status: res.status, headers: { "Content-Type": "application/json" } });
});

/**
 * GET /v1/chat/conversations/:id
 */
chat.get("/conversations/:id", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const id = c.req.param("id");

  const res = await fetch(`${AI_URL()}/chat/conversations/${id}`, {
    headers: { Authorization: authHeader },
  });
  const data = await res.text();
  return new Response(data, { status: res.status, headers: { "Content-Type": "application/json" } });
});

export default chat;
