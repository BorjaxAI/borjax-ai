import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { tokenCheckMiddleware } from "../middleware/token-check";

const agents = new Hono();
const AI_URL = () => process.env.AI_SERVICE_URL ?? "http://ai:8000";

agents.use("*", authMiddleware);

const proxy = async (method: string, url: string, authHeader: string, body?: string) => {
  const headers: Record<string, string> = { Authorization: authHeader };
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(url, { method, headers, body });
  const data = await res.text();
  return new Response(data, { status: res.status, headers: { "Content-Type": "application/json" } });
};

/** GET /v1/agents — List agents */
agents.get("/", (c) =>
  proxy("GET", `${AI_URL()}/agents`, c.req.header("Authorization") ?? "")
);

/** POST /v1/agents — Create agent */
agents.post("/", async (c) =>
  proxy("POST", `${AI_URL()}/agents`, c.req.header("Authorization") ?? "", await c.req.text())
);

/** GET /v1/agents/:id */
agents.get("/:id", (c) =>
  proxy("GET", `${AI_URL()}/agents/${c.req.param("id")}`, c.req.header("Authorization") ?? "")
);

/** PUT /v1/agents/:id */
agents.put("/:id", async (c) =>
  proxy("PUT", `${AI_URL()}/agents/${c.req.param("id")}`, c.req.header("Authorization") ?? "", await c.req.text())
);

/** DELETE /v1/agents/:id */
agents.delete("/:id", (c) =>
  proxy("DELETE", `${AI_URL()}/agents/${c.req.param("id")}`, c.req.header("Authorization") ?? "")
);

/** POST /v1/agents/:id/run — Run agent (dispatches to task queue) */
agents.post("/:id/run", tokenCheckMiddleware, async (c) =>
  proxy("POST", `${AI_URL()}/agents/${c.req.param("id")}/run`, c.req.header("Authorization") ?? "", await c.req.text())
);

export default agents;
