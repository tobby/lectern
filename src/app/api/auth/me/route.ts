import { db } from "@/lib/db/drizzle";
import { requireAuth } from "@/lib/auth/session";
import { json, error } from "@/lib/api-utils";

export async function GET() {
  try {
    const session = await requireAuth();

    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, session.sub),
      columns: {
        id: true,
        fullName: true,
        email: true,
        isAdmin: true,
        emailVerifiedAt: true,
        createdAt: true,
        educationLevel: true,
        fieldOfStudy: true,
        learningGoal: true,
        googleId: true,
      },
    });

    if (!user) return error("User not found", 404);

    return json({
      ...user,
      emailVerified: !!user.emailVerifiedAt,
      hasGoogleLinked: !!user.googleId,
    });
  } catch {
    return error("Unauthorized", 401);
  }
}
