import { db } from "@/lib/db/drizzle";
import { materials, lectures } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { json, error, withAdmin } from "@/lib/api-utils";
import { deleteFromR2 } from "@/lib/r2/client";

export const DELETE = withAdmin(async (_req, { user, params }) => {
  const id = params!.id;

  const material = await db.query.materials.findFirst({
    where: (m, { eq: e }) => e(m.id, id),
    with: {
      lecture: {
        with: { module: { with: { course: true } } },
      },
    },
  });

  if (!material) return error("Material not found", 404);
  if (material.lecture.module.course.createdBy !== user.sub)
    return error("Forbidden", 403);

  // Delete from R2
  try {
    await deleteFromR2(material.r2Key);
  } catch (e) {
    console.error("Failed to delete from R2:", e);
  }

  // Delete from DB
  await db.delete(materials).where(eq(materials.id, id));

  // Check if this was the last material — if so, reset ai_status
  const remaining = await db.query.materials.findMany({
    where: (m, { eq: e }) => e(m.lectureId, material.lectureId),
  });

  if (remaining.length === 0) {
    await db
      .update(lectures)
      .set({ aiStatus: "pending" })
      .where(eq(lectures.id, material.lectureId));
  }

  return json({ message: "Material deleted" });
});
