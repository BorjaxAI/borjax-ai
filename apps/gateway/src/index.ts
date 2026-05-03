import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { timing } from "hono/timing";

import authRoutes from "./routes/auth";
import chatRoutes from "./routes/chat";
import tasksRoutes from "./routes/tasks";
import agentsRoutes from "./routes/agents";
import billingRoutes from "./routes/billing";

const app = new Hono();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use("*", logger());
app.use("*", timing());
app.use("*", secureHeaders());

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173").split(",");

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return origin;
      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) return origin;
      return null;
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposeHeaders: ["X-Request-Id"],
    credentials: true,
    maxAge: 86400,
  })
);

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (c) =>
  c.json({ status: "ok", service: "borjaxai-gateway", timestamp: new Date().toISOString() })
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.route("/v1/auth", authRoutes);
app.route("/v1/chat", chatRoutes);
app.route("/v1/tasks", tasksRoutes);
app.route("/v1/agents", agentsRoutes);
app.route("/v1/billing", billingRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: "Not Found", path: c.req.path }, 404));

app.onError((err, c) => {
  console.error("[gateway error]", err);
  return c.json({ error: "Internal Server Error", message: err.message }, 500);
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "3000");

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`🚀 BorjaxAI Gateway running on http://localhost:${info.port}`);
  console.log(`   AI Backend: ${process.env.AI_SERVICE_URL ?? "http://localhost:8000"}`);
});

export default app;
