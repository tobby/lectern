import { db } from "@/lib/db/drizzle";
import { modules } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { json, error, withOwner } from "@/lib/api-utils";

export const POST = withOwner(async (req, { user, params, course }) => {
  const courseId = params!.id;
  const body = await req.json();

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
