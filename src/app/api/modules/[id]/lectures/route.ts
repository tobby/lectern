import { db } from "@/lib/db/drizzle";
import { lectures, modules } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { json, error, withAdmin } from "@/lib/api-utils";

export const POST = withAdmin(async (req, { user, params }) => {
  const moduleId = params!.id;
  const body = await req.json();

  const module = await db.query.modules.findFirst({
    where: (m, { eq: e }) => e(m.id, moduleId),
    with: { course: true },
  });

  if (!module) return error("Module not found", 404);
  if (module.course.createdBy !== user.sub) return error("Forbidden", 403);

  if (!body.title || typeof body.title !== "string") {
    return error("Lecture title is required");
  }

  // Get next order index
  const existingLectures = await db.query.lectures.findMany({
    where: (l, { eq: e }) => e(l.moduleId, moduleId),
    columns: { orderIndex: true },
  });
  const nextOrder =
    existingLectures.length > 0
      ? Math.max(...existingLectures.map((l) => l.orderIndex)) + 1
      : 0;

  const [lecture] = await db
    .insert(lectures)
    .values({
      moduleId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      orderIndex: body.orderIndex ?? nextOrder,
    })
    .returning();

  return json(lecture, 201);
});
