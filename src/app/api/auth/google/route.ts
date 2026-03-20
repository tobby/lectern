import { OAuth2Client } from "google-auth-library";
import { db } from "@/lib/db/drizzle";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/auth/session";
import { json, error, withRateLimit } from "@/lib/api-utils";

const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export async function POST(req: Request) {
  const rateLimited = withRateLimit("google-auth", 10, 15 * 60 * 1000, req);
  if (rateLimited) return rateLimited;

  const { idToken } = await req.json();

  if (!idToken || typeof idToken !== "string") {
    return error("ID token is required", 400);
  }

  // Verify the Google ID token
  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    return error("Invalid Google token", 401);
  }

  if (!payload || !payload.email) {
    return error("Could not verify Google account", 401);
  }

  const { sub: googleId, email, name, picture } = payload;

  let isNewUser = false;

  // Check if user exists by googleId
  let user = await db.query.users.findFirst({
    where: (u, { eq: e }) => e(u.googleId, googleId!),
  });

  if (!user) {
    // Check if user exists by email (link accounts)
    user = await db.query.users.findFirst({
      where: (u, { eq: e }) => e(u.email, email!),
    });

    if (user) {
      // Link Google account to existing user
      await db
        .update(users)
        .set({
          googleId,
          avatarUrl: user.avatarUrl || picture,
          emailVerifiedAt: user.emailVerifiedAt || new Date(),
          lastLoginAt: new Date(),
        })
        .where(eq(users.id, user.id));
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          fullName: name || email!.split("@")[0],
          email: email!,
          googleId,
          avatarUrl: picture,
          emailVerifiedAt: new Date(), // Google emails are verified
        })
        .returning();
      user = newUser;
      isNewUser = true;
    }
  } else {
    // Existing Google user — update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));
  }

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
      isNewUser,
    },
  });
}
