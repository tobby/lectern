import { db } from "@/lib/db/drizzle";
import {
  courses,
  modules,
  lectures,
  materials,
  studyAids,
  enrollments,
  progress,
  chatSessions,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { json, error, withAuth, withOwner } from "@/lib/api-utils";
import { deleteFromR2 } from "@/lib/r2/client";

// Get course detail (any authenticated user)
export const GET = withAuth(async (_req, { params }) => {
  const id = params!.id;

  const course = await db.query.courses.findFirst({
    where: (c, { eq: e }) => e(c.id, id),
    with: {
      institution: true,
      modules: {
        orderBy: (m, { asc }) => asc(m.orderIndex),
        with: {
          lectures: {
            orderBy: (l, { asc }) => asc(l.orderIndex),
          },
        },
      },
    },
  });

  if (!course) return error("Course not found", 404);

  return json(course);
});

// Update course (owner or admin)
export const PATCH = withOwner(async (req, { user, params, course }) => {
  const id = params!.id;
  const body = await req.json();

  const [updated] = await db
    .update(courses)
    .set({
      ...(body.title && { title: body.title.trim() }),
      ...(body.description !== undefined && {
        description: body.description?.trim() || null,
      }),
      ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
      ...(body.status && { status: body.status }),
      ...(body.institutionId !== undefined && {
        institutionId: body.institutionId || null,
      }),
      ...(body.thumbnailUrl !== undefined && {
        thumbnailUrl: body.thumbnailUrl || null,
      }),
      updatedAt: new Date(),
    })
    .where(eq(courses.id, id))
    .returning();

  return json(updated);
});

// Delete course with full cascade (owner or admin)
export const DELETE = withOwner(async (_req, { user, params, course }) => {
  const id = params!.id;

  // Get all materials for R2 cleanup
  const courseModules = await db.query.modules.findMany({
    where: (m, { eq: e }) => e(m.courseId, id),
    columns: { id: true },
  });

  if (courseModules.length > 0) {
    const moduleIds = courseModules.map((m) => m.id);
    const courseLectures = await db.query.lectures.findMany({
      where: (l, { inArray: iA }) => iA(l.moduleId, moduleIds),
      columns: { id: true },
    });

    if (courseLectures.length > 0) {
      const lectureIds = courseLectures.map((l) => l.id);
      const courseMaterials = await db.query.materials.findMany({
        where: (m, { inArray: iA }) => iA(m.lectureId, lectureIds),
      });

      // Delete R2 files
      for (const material of courseMaterials) {
        try {
          await deleteFromR2(material.r2Key);
        } catch (e) {
          console.error(`Failed to delete R2 object ${material.r2Key}:`, e);
        }
      }
    }
  }

  // Cascade delete handled by DB foreign keys
  await db.delete(courses).where(eq(courses.id, id));

  return json({ message: "Course deleted" });
});
