import type { Context, Next } from "hono";

const TOKEN_LIMITS: Record<string, number> = {
  free: 10_000,
  starter: 100_000,
  pro: 500_000,
  agency: 2_000_000,
};

/**
 * Checks token quota by asking the AI service about the user's current usage.
 * Blocks the request if the user has exceeded their plan limit.
 */
export async function tokenCheckMiddleware(c: Context, next: Next): Promise<Response | void> {
  const user = c.get("user");
  if (!user) return next();

  const aiUrl = process.env.AI_SERVICE_URL ?? "http://ai:8000";

  try {
    const res = await fetch(`${aiUrl}/internal/token-usage/${user.sub}`, {
      headers: { "X-Internal-Secret": process.env.INTERNAL_SECRET ?? "borjax_internal" },
    });

    if (!res.ok) {
      // If we can't check, allow through (fail open)
      return next();
    }

    const data = (await res.json()) as { tokens_used: number; plan: string };
    const limit = TOKEN_LIMITS[data.plan] ?? TOKEN_LIMITS["free"];

    if (data.tokens_used >= limit) {
      return c.json(
        {
          error: "Token Limit Exceeded",
          message: `You have used all ${limit.toLocaleString()} tokens on your ${data.plan} plan. Please upgrade to continue.`,
          tokens_used: data.tokens_used,
          tokens_limit: limit,
          plan: data.plan,
        },
        429
      );
    }
  } catch {
    // Fail open — don't block requests if token check service is down
    console.warn("[token-check] Could not reach AI service for token check, allowing request");
  }

  return next();
}
