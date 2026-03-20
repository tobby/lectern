import { db } from "@/lib/db/drizzle";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { validateLogin } from "@/lib/validations/auth";
import { json, error, withRateLimit } from "@/lib/api-utils";

export async function POST(req: Request) {
  const rateLimited = withRateLimit("login", 10, 15 * 60 * 1000, req);
  if (rateLimited) return rateLimited;

  const body = await req.json();
  const validation = validateLogin(body);

  if (!validation.valid) {
    return error(validation.error!, 400);
  }

  const { email, password } = validation.data!;

  const user = await db.query.users.findFirst({
    where: (u, { eq: e }) => e(u.email, email),
  });

  if (!user) {
    return error("Invalid email or password", 401);
  }

  if (!user.passwordHash) {
    return error("This account uses Google Sign-In. Please sign in with Google.", 400);
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    return error("Invalid email or password", 401);
  }

  // Update last login
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  await createSession({
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
  });

  return json({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      isAdmin: user.isAdmin,
      emailVerified: !!user.emailVerifiedAt,
    },
  });
}
