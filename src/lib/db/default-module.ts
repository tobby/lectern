import { db } from "./drizzle";
import { modules } from "./schema";
import { eq, and } from "drizzle-orm";

const DEFAULT_MODULE_TITLE = "__default__";

export async function getOrCreateDefaultModule(
  courseId: string
): Promise<string> {
  // Try to find existing default module
  const existing = await db.query.modules.findFirst({
    where: (m, { eq: e, and: a }) =>
      a(e(m.courseId, courseId), e(m.title, DEFAULT_MODULE_TITLE)),
  });

  if (existing) return existing.id;

  // Create default module
  const [created] = await db
    .insert(modules)
    .values({
      courseId,
      title: DEFAULT_MODULE_TITLE,
      orderIndex: -1,
    })
    .returning();

  return created.id;
}
