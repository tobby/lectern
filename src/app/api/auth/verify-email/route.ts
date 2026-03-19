import { db } from "@/lib/db/drizzle";
import { users, emailVerificationTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { json, error } from "@/lib/api-utils";

export async function POST(req: Request) {
  const { token } = await req.json();

  if (!token || typeof token !== "string") {
    return error("Token is required", 400);
  }

  // Find non-expired, unused tokens
  const tokens = await db.query.emailVerificationTokens.findMany({
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
    return error("Invalid or expired verification token", 400);
  }

  // Mark token as used
  await db
    .update(emailVerificationTokens)
    .set({ usedAt: new Date() })
    .where(eq(emailVerificationTokens.id, matchedToken.id));

  // Verify user email
  await db
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(users.id, matchedToken.userId));

  return json({ message: "Email verified successfully" });
}
