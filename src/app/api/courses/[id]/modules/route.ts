import { db } from "@/lib/db/drizzle";
import { modules, courses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { json, error, withAdmin } from "@/lib/api-utils";

export const POST = withAdmin(async (req, { user, params }) => {
  const courseId = params!.id;
  const body = await req.json();

  const course = await db.query.courses.findFirst({
    where: (c, { eq: e }) => e(c.id, courseId),
  });

  if (!course) return error("Course not found", 404);
  if (course.createdBy !== user.sub) return error("Forbidden", 403);

  if (!body.title || typeof body.title !== "string") {
    return error("Module title is required");
  }

  // Get next order index
  const existingModules = await db.query.modules.findMany({
    where: (m, { eq: e }) => e(m.courseId, courseId),
    columns: { orderIndex: true },
  });
  const nextOrder =
    existingModules.length > 0
      ? Math.max(...existingModules.map((m) => m.orderIndex)) + 1
      : 0;

  const [module] = await db
    .insert(modules)
    .values({
      courseId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      orderIndex: body.orderIndex ?? nextOrder,
    })
    .returning();

  return json(module, 201);
});
