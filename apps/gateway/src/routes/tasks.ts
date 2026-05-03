import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { tokenCheckMiddleware } from "../middleware/token-check";

const tasks = new Hono();
const AI_URL = () => process.env.AI_SERVICE_URL ?? "http://ai:8000";

tasks.use("*", authMiddleware);
tasks.use("*", tokenCheckMiddleware);

/** POST /v1/tasks — Create a new background task */
tasks.post("/", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const body = await c.req.text();

  const res = await fetch(`${AI_URL()}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader },
    body,
  });
  const data = await res.text();
  return new Response(data, { status: res.status, headers: { "Content-Type": "application/json" } });
});

/** GET /v1/tasks — List tasks */
tasks.get("/", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const url = new URL(`${AI_URL()}/tasks`);
  const page = c.req.query("page");
  const limit = c.req.query("limit");
  const status = c.req.query("status");
  if (page) url.searchParams.set("page", page);
  if (limit) url.searchParams.set("limit", limit);
  if (status) url.searchParams.set("status", status);

  const res = await fetch(url.toString(), { headers: { Authorization: authHeader } });
  const data = await res.text();
  return new Response(data, { status: res.status, headers: { "Content-Type": "application/json" } });
});

/** GET /v1/tasks/:id — Get a task by ID */
tasks.get("/:id", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const id = c.req.param("id");

  const res = await fetch(`${AI_URL()}/tasks/${id}`, { headers: { Authorization: authHeader } });
  const data = await res.text();
  return new Response(data, { status: res.status, headers: { "Content-Type": "application/json" } });
});

/** DELETE /v1/tasks/:id — Cancel a task */
tasks.delete("/:id", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const id = c.req.param("id");

  const res = await fetch(`${AI_URL()}/tasks/${id}`, {
    method: "DELETE",
    headers: { Authorization: authHeader },
  });
  const data = await res.text();
  return new Response(data, { status: res.status, headers: { "Content-Type": "application/json" } });
});

export default tasks;
