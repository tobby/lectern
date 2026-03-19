import { db } from "@/lib/db/drizzle";
import { progress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { json, error, withAuth } from "@/lib/api-utils";

export const POST = withAuth(async (req, { user, params }) => {
  const lectureId = params!.id;
  const { status } = await req.json();

  const validStatuses = ["not_started", "in_progress", "completed"];
  if (!status || !validStatuses.includes(status)) {
    return error("Invalid status. Must be: not_started, in_progress, or completed");
  }

  const lecture = await db.query.lectures.findFirst({
    where: (l, { eq: e }) => e(l.id, lectureId),
  });

  if (!lecture) return error("Lecture not found", 404);

  // Upsert progress
  const existing = await db.query.progress.findFirst({
    where: (p, { eq: e, and: a }) =>
      a(e(p.userId, user.sub), e(p.lectureId, lectureId)),
  });

  if (existing) {
    const [updated] = await db
      .update(progress)
      .set({ status, lastAccessedAt: new Date() })
      .where(eq(progress.id, existing.id))
      .returning();
    return json(updated);
  }

  const [created] = await db
    .insert(progress)
    .values({ userId: user.sub, lectureId, status })
    .returning();

  return json(created, 201);
});
