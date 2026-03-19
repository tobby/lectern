import { db } from "@/lib/db/drizzle";
import { refreshTokens, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword, verifyPassword } from "./password";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  type JwtPayload,
} from "./jwt";
import {
  setAuthCookies,
  clearAuthCookies,
  getAccessToken,
  getRefreshTokenCookie,
} from "./cookies";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

export async function createSession(user: {
  id: string;
  email: string;
  isAdmin: boolean;
}) {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
  };

  const accessToken = signAccessToken(payload);
  const rawRefreshToken = uuidv4();
  const refreshTokenHash = await bcrypt.hash(rawRefreshToken, 10);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: refreshTokenHash,
    expiresAt,
  });

  await setAuthCookies(accessToken, rawRefreshToken);

  return { accessToken, refreshToken: rawRefreshToken };
}

export async function getCurrentUser(): Promise<JwtPayload | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<JwtPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireAdmin(): Promise<JwtPayload> {
  const user = await requireAuth();
  if (!user.isAdmin) {
    throw new Error("Forbidden");
  }
  return user;
}

export async function destroySession(userId: string) {
  await db
    .delete(refreshTokens)
    .where(eq(refreshTokens.userId, userId));
  await clearAuthCookies();
}

export async function rotateTokens() {
  const rawRefresh = await getRefreshTokenCookie();
  if (!rawRefresh) throw new Error("No refresh token");

  // Find all non-expired refresh tokens for validation
  const allTokens = await db.query.refreshTokens.findMany({
    where: (t, { gt }) => gt(t.expiresAt, new Date()),
  });

  let matchedToken: (typeof allTokens)[0] | null = null;
  for (const t of allTokens) {
    if (await bcrypt.compare(rawRefresh, t.tokenHash)) {
      matchedToken = t;
      break;
    }
  }

  if (!matchedToken) throw new Error("Invalid refresh token");

  // Delete old token
  await db.delete(refreshTokens).where(eq(refreshTokens.id, matchedToken.id));

  // Get user
  const user = await db.query.users.findFirst({
    where: (u, { eq: e }) => e(u.id, matchedToken!.userId),
  });

  if (!user) throw new Error("User not found");

  // Create new session
  return createSession({
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
  });
}
