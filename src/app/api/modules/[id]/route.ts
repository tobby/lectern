import { db } from "@/lib/db/drizzle";
import { modules, courses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { json, error, withAdmin } from "@/lib/api-utils";

export const PATCH = withAdmin(async (req, { user, params }) => {
  const id = params!.id;
  const body = await req.json();

  const module = await db.query.modules.findFirst({
    where: (m, { eq: e }) => e(m.id, id),
    with: { course: true },
  });

  if (!module) return error("Module not found", 404);
  if (module.course.createdBy !== user.sub) return error("Forbidden", 403);

  const [updated] = await db
    .update(modules)
    .set({
      ...(body.title && { title: body.title.trim() }),
      ...(body.description !== undefined && {
        description: body.description?.trim() || null,
      }),
      ...(body.orderIndex !== undefined && { orderIndex: body.orderIndex }),
    })
    .where(eq(modules.id, id))
    .returning();

  return json(updated);
});

export const DELETE = withAdmin(async (_req, { user, params }) => {
  const id = params!.id;

  const module = await db.query.modules.findFirst({
    where: (m, { eq: e }) => e(m.id, id),
    with: { course: true },
  });

  if (!module) return error("Module not found", 404);
  if (module.course.createdBy !== user.sub) return error("Forbidden", 403);

  await db.delete(modules).where(eq(modules.id, id));
  return json({ message: "Module deleted" });
});
