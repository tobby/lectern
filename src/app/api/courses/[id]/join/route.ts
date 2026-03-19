import { db } from "@/lib/db/drizzle";
import { enrollments, courses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { json, error, withAuth } from "@/lib/api-utils";

export const POST = withAuth(async (req, { user, params }) => {
  const courseId = params!.id;
  const { inviteCode } = await req.json();

  if (!inviteCode || typeof inviteCode !== "string") {
    return error("Invite code is required");
  }

  const course = await db.query.courses.findFirst({
    where: (c, { eq: e, and: a }) =>
      a(
        e(c.id, courseId),
        e(c.status, "published"),
        e(c.inviteCode, inviteCode.trim())
      ),
  });

  if (!course) return error("Invalid invite code or course not found", 404);

  // Check for existing enrollment
  const existing = await db.query.enrollments.findFirst({
    where: (e, { eq: eq_, and: a }) =>
      a(eq_(e.userId, user.sub), eq_(e.courseId, courseId)),
  });

  if (existing) return error("Already enrolled", 409);

  const [enrollment] = await db
    .insert(enrollments)
    .values({ userId: user.sub, courseId })
    .returning();

  return json(enrollment, 201);
});
