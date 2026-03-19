import { db } from "@/lib/db/drizzle";
import { lectures, modules } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { json, error, withAuth, withAdmin } from "@/lib/api-utils";

export const GET = withAuth(async (_req, { params }) => {
  const id = params!.id;

  const lecture = await db.query.lectures.findFirst({
    where: (l, { eq: e }) => e(l.id, id),
    with: {
      module: {
        with: {
          course: true,
        },
      },
    },
  });

  if (!lecture) return error("Lecture not found", 404);

  return json(lecture);
});

export const PATCH = withAdmin(async (req, { user, params }) => {
  const id = params!.id;
  const body = await req.json();

  const lecture = await db.query.lectures.findFirst({
    where: (l, { eq: e }) => e(l.id, id),
    with: { module: { with: { course: true } } },
  });

  if (!lecture) return error("Lecture not found", 404);
  if (lecture.module.course.createdBy !== user.sub)
    return error("Forbidden", 403);

  const [updated] = await db
    .update(lectures)
    .set({
      ...(body.title && { title: body.title.trim() }),
      ...(body.description !== undefined && {
        description: body.description?.trim() || null,
      }),
      ...(body.orderIndex !== undefined && { orderIndex: body.orderIndex }),
    })
    .where(eq(lectures.id, id))
    .returning();

  return json(updated);
});

export const DELETE = withAdmin(async (_req, { user, params }) => {
  const id = params!.id;

  const lecture = await db.query.lectures.findFirst({
    where: (l, { eq: e }) => e(l.id, id),
    with: { module: { with: { course: true } } },
  });

  if (!lecture) return error("Lecture not found", 404);
  if (lecture.module.course.createdBy !== user.sub)
    return error("Forbidden", 403);

  await db.delete(lectures).where(eq(lectures.id, id));
  return json({ message: "Lecture deleted" });
});
