import type { Context, Next } from "hono";

const TOKEN_LIMITS: Record<string, number> = {
  guest: 5_000,
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

    const data = (await res.json()) as { tokens_used: number; tokens_limit?: number; plan: string; is_guest?: boolean };
    const limit = data.tokens_limit ?? TOKEN_LIMITS[data.plan] ?? TOKEN_LIMITS["free"];

    if (data.tokens_used >= limit) {
      return c.json(
        {
          detail: {
            code: "TOKEN_LIMIT_REACHED",
            is_guest: data.is_guest ?? false,
            plan: data.plan,
            tokens_used: data.tokens_used,
            tokens_limit: limit,
            message: data.is_guest
              ? `You've used all ${limit.toLocaleString()} free guest tokens. Create a free account to get 10,000 tokens.`
              : `You have used all ${limit.toLocaleString()} tokens on your ${data.plan} plan. Please upgrade to continue.`,
          },
        },
        402
      );
    }
  } catch {
    // Fail open — don't block requests if token check service is down
    console.warn("[token-check] Could not reach AI service for token check, allowing request");
  }

  return next();
}
