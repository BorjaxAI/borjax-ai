import { Hono } from "hono";

const auth = new Hono();
const AI_URL = () => process.env.AI_SERVICE_URL ?? "http://ai:8000";

/**
 * Proxies all /v1/auth/* requests to the FastAPI AI backend.
 * No auth middleware here — these are public endpoints.
 */

auth.post("/register", async (c) => {
  const body = await c.req.text();
  const res = await fetch(`${AI_URL()}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
});

auth.post("/login", async (c) => {
  const body = await c.req.text();
  const res = await fetch(`${AI_URL()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
});

auth.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const res = await fetch(`${AI_URL()}/auth/me`, {
    headers: { Authorization: authHeader },
  });
  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
});

auth.post("/guest", async (c) => {
  const res = await fetch(`${AI_URL()}/auth/guest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
});

export default auth;
