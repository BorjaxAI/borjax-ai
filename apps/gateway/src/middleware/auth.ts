import type { Context, Next } from "hono";
import jwt from "jsonwebtoken";

export interface JwtPayload {
  sub: string;
  email: string;
  plan: string;
  iat: number;
  exp: number;
}

declare module "hono" {
  interface ContextVariableMap {
    user: JwtPayload;
  }
}

export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized", message: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET ?? "dev_secret_change_me";

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    c.set("user", payload);
    await next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return c.json({ error: "Unauthorized", message: "Token has expired" }, 401);
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return c.json({ error: "Unauthorized", message: "Invalid token" }, 401);
    }
    return c.json({ error: "Unauthorized", message: "Authentication failed" }, 401);
  }
}
