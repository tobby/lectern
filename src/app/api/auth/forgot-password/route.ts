import { db } from "@/lib/db/drizzle";
import { passwordResetTokens } from "@/lib/db/schema";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { sendPasswordResetEmail } from "@/lib/email/send";
import { json, error, withRateLimit } from "@/lib/api-utils";

export async function POST(req: Request) {
  const rateLimited = withRateLimit("forgot-password", 3, 60 * 60 * 1000, req);
  if (rateLimited) return rateLimited;

  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return error("Email is required", 400);
  }

  // Always return success to prevent email enumeration
  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, email.toLowerCase().trim()),
  });

  if (user) {
    const rawToken = uuidv4();
    const tokenHash = await bcrypt.hash(rawToken, 10);

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    await sendPasswordResetEmail(user.email, rawToken);
  }

  return json({
    message: "If that email is registered, a reset link has been sent.",
  });
}
