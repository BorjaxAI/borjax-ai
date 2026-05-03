import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";

const billing = new Hono();

const AI_URL = () => process.env.AI_SERVICE_URL ?? "http://ai:8000";

/** GET /v1/billing/plans — public */
billing.get("/plans", async (c) => {
  const res = await fetch(`${AI_URL()}/billing/plans`);
  const data = await res.text();
  return new Response(data, { status: res.status, headers: { "Content-Type": "application/json" } });
});

/** GET /v1/billing/usage — requires auth */
billing.get("/usage", authMiddleware, async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const res = await fetch(`${AI_URL()}/billing/usage`, {
    headers: { Authorization: authHeader },
  });
  const data = await res.text();
  return new Response(data, { status: res.status, headers: { "Content-Type": "application/json" } });
});

/** POST /v1/billing/checkout — requires auth, creates Stripe checkout */
billing.post("/checkout", authMiddleware, async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const body = await c.req.text();
  const res = await fetch(`${AI_URL()}/billing/create-checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader },
    body,
  });
  const data = await res.text();
  return new Response(data, { status: res.status, headers: { "Content-Type": "application/json" } });
});

/** POST /v1/billing/portal — requires auth, creates Stripe customer portal */
billing.post("/portal", authMiddleware, async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const body = await c.req.text();
  const res = await fetch(`${AI_URL()}/billing/portal`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader },
    body,
  });
  const data = await res.text();
  return new Response(data, { status: res.status, headers: { "Content-Type": "application/json" } });
});

/** POST /v1/billing/webhook — NO auth, Stripe signs the payload */
billing.post("/webhook", async (c) => {
  const body = await c.req.text();
  const sig = c.req.header("stripe-signature") ?? "";
  const res = await fetch(`${AI_URL()}/billing/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": sig,
    },
    body,
  });
  const data = await res.text();
  return new Response(data, { status: res.status, headers: { "Content-Type": "application/json" } });
});

export default billing;
