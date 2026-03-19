import { NextResponse } from "next/server";
import { getCurrentUser, requireAuth, requireAdmin } from "./auth/session";
import { rateLimit } from "./rate-limit";
import type { JwtPayload } from "./auth/jwt";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type HandlerFn = (
  req: Request,
  context: { user: JwtPayload; params?: Record<string, string> }
) => Promise<NextResponse | Response>;

export function withAuth(handler: HandlerFn) {
  return async (req: Request, ctx?: { params: Promise<Record<string, string>> }) => {
    try {
      const user = await requireAuth();
      const params = ctx ? await ctx.params : undefined;
      return handler(req, { user, params: params });
    } catch {
      return error("Unauthorized", 401);
    }
  };
}

export function withAdmin(handler: HandlerFn) {
  return async (req: Request, ctx?: { params: Promise<Record<string, string>> }) => {
    try {
      const user = await requireAdmin();
      const params = ctx ? await ctx.params : undefined;
      return handler(req, { user, params: params });
    } catch (e: any) {
      if (e.message === "Forbidden") return error("Forbidden", 403);
      return error("Unauthorized", 401);
    }
  };
}

export function withRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  req: Request
): NextResponse | null {
  // Use IP or forwarded header
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const result = rateLimit(`${key}:${ip}`, limit, windowMs);

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((result.resetAt - Date.now()) / 1000)
          ),
        },
      }
    );
  }

  return null;
}

export function userRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  userId: string
): NextResponse | null {
  const result = rateLimit(`${key}:${userId}`, limit, windowMs);

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((result.resetAt - Date.now()) / 1000)
          ),
        },
      }
    );
  }

  return null;
}
