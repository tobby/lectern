import { db } from "@/lib/db/drizzle";
import { lectures, modules } from "@/lib/db/schema";
import { eq, inArray, asc } from "drizzle-orm";
import { json, error, withAuth } from "@/lib/api-utils";

export const GET = withAuth(async (req, { user, params }) => {
  const courseId = params!.id;

  const course = await db.query.courses.findFirst({
    where: (c, { eq: e }) => e(c.id, courseId),
  });
  if (!course) return error("Course not found", 404);

  // Get all modules for this course
  const courseModules = await db.query.modules.findMany({
    where: (m, { eq: e }) => e(m.courseId, courseId),
  });

  if (courseModules.length === 0) return json([]);

  const moduleIds = courseModules.map((m) => m.id);

  // Get all lectures across all modules, flat
  const allLectures = await db.query.lectures.findMany({
    where: (l, { inArray: iA }) => iA(l.moduleId, moduleIds),
    orderBy: (l) => asc(l.orderIndex),
    with: { studyAid: true },
  });

  return json(allLectures);
});
