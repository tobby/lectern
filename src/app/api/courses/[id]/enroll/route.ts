import { db } from "@/lib/db/drizzle";
import { enrollments, courses } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { json, error, withAuth } from "@/lib/api-utils";

export const POST = withAuth(async (_req, { user, params }) => {
  const courseId = params!.id;

  const course = await db.query.courses.findFirst({
    where: (c, { eq: e, and: a }) =>
      a(e(c.id, courseId), e(c.status, "published"), e(c.isPublic, true)),
  });

  if (!course) return error("Course not found or not available", 404);

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
