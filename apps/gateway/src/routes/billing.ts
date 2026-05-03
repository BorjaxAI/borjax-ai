import { Hono } from "hono";
import Stripe from "stripe";
import { authMiddleware } from "../middleware/auth";

const billing = new Hono();

const getStripe = () =>
  new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2025-02-24.acacia" });

const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER ?? "",
  pro: process.env.STRIPE_PRICE_PRO ?? "",
  agency: process.env.STRIPE_PRICE_AGENCY ?? "",
};

billing.use("*", authMiddleware);

/**
 * POST /v1/billing/checkout — Create a Stripe Checkout session
 */
billing.post("/checkout", async (c) => {
  const user = c.get("user");
  const { plan } = await c.req.json<{ plan: string }>();
  const priceId = PRICE_IDS[plan];

  if (!priceId) {
    return c.json({ error: "Invalid plan. Choose: starter, pro, agency" }, 400);
  }

  const stripe = getStripe();
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/billing?canceled=1`,
    metadata: { user_id: user.sub, plan },
    customer_email: user.email,
  });

  return c.json({ url: session.url });
});

/**
 * POST /v1/billing/portal — Create a Stripe Customer Portal session
 */
billing.post("/portal", async (c) => {
  const user = c.get("user");
  const stripe = getStripe();
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  // Look up customer by metadata
  const customers = await stripe.customers.search({
    query: `metadata['user_id']:'${user.sub}'`,
    limit: 1,
  });

  if (!customers.data.length) {
    return c.json({ error: "No billing account found. Please subscribe to a plan first." }, 404);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customers.data[0].id,
    return_url: `${appUrl}/billing`,
  });

  return c.json({ url: session.url });
});

/**
 * POST /v1/billing/webhook — Handle Stripe webhook events
 * (No auth middleware — Stripe signs the payload)
 */
billing.post("/webhook", async (c) => {
  const stripe = getStripe();
  const sig = c.req.header("stripe-signature") ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  const body = await c.req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[billing/webhook] Signature verification failed:", err);
    return c.json({ error: "Invalid signature" }, 400);
  }

  // Forward to AI service for DB updates
  const aiUrl = process.env.AI_SERVICE_URL ?? "http://ai:8000";
  await fetch(`${aiUrl}/internal/billing-webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": process.env.INTERNAL_SECRET ?? "borjax_internal",
    },
    body: JSON.stringify(event),
  });

  return c.json({ received: true });
});

export default billing;
