import { NextResponse } from "next/server";
import { db } from "@/lib/db/drizzle";
import { users, emailVerificationTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { validateSignup } from "@/lib/validations/auth";
import { sendVerificationEmail } from "@/lib/email/send";
import { json, error, withRateLimit } from "@/lib/api-utils";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const rateLimited = withRateLimit("signup", 5, 60 * 60 * 1000, req);
  if (rateLimited) return rateLimited;

  const body = await req.json();
  const validation = validateSignup(body);

  if (!validation.valid) {
    return error(validation.error!, 400);
  }

  const { fullName, email, password } = validation.data!;

  // Check email uniqueness
  const existing = await db.query.users.findFirst({
    where: (u, { eq: e }) => e(u.email, email),
  });

  if (existing) {
    return error("Email already registered", 409);
  }

  // Create user
  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ fullName, email, passwordHash })
    .returning({ id: users.id, email: users.email, isAdmin: users.isAdmin });

  // Create email verification token
  const rawToken = uuidv4();
  const tokenHash = await bcrypt.hash(rawToken, 10);
  await db.insert(emailVerificationTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  // Send verification email (console in dev)
  await sendVerificationEmail(email, rawToken);

  // Create session
  await createSession(user);

  return json(
    {
      user: { id: user.id, email: user.email, isAdmin: user.isAdmin },
      message: "Account created. Please verify your email.",
    },
    201
  );
}
