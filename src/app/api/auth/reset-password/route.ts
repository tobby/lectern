import { db } from "@/lib/db/drizzle";
import { users, passwordResetTokens, refreshTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { hashPassword } from "@/lib/auth/password";
import { json, error } from "@/lib/api-utils";

export async function POST(req: Request) {
  const { token, password } = await req.json();

  if (!token || typeof token !== "string") {
    return error("Token is required", 400);
  }

  if (!password || typeof password !== "string" || password.length < 8) {
    return error("Password must be at least 8 characters", 400);
  }

  // Find valid tokens
  const tokens = await db.query.passwordResetTokens.findMany({
    where: (t, { isNull, gt, and }) =>
      and(isNull(t.usedAt), gt(t.expiresAt, new Date())),
  });

  let matchedToken: (typeof tokens)[0] | null = null;
  for (const t of tokens) {
    if (await bcrypt.compare(token, t.tokenHash)) {
      matchedToken = t;
      break;
    }
  }

  if (!matchedToken) {
    return error("Invalid or expired reset token", 400);
  }

  // Mark token as used
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, matchedToken.id));

  // Update password
  const passwordHash = await hashPassword(password);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, matchedToken.userId));

  // Invalidate all refresh tokens
  await db
    .delete(refreshTokens)
    .where(eq(refreshTokens.userId, matchedToken.userId));

  return json({ message: "Password reset successfully. Please log in." });
}
