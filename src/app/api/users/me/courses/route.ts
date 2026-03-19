import { db } from "@/lib/db/drizzle";
import { enrollments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { json, error, withAuth } from "@/lib/api-utils";

export const GET = withAuth(async (_req, { user }) => {
  const userEnrollments = await db.query.enrollments.findMany({
    where: (e, { eq: eq_ }) => eq_(e.userId, user.sub),
    with: {
      course: {
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
      },
    },
  });

  // Also fetch progress for all lectures in enrolled courses
  const courseData = await Promise.all(
    userEnrollments.map(async (enrollment) => {
      const lectureIds = enrollment.course.modules.flatMap((m) =>
        m.lectures.map((l) => l.id)
      );

      const progressRecords =
        lectureIds.length > 0
          ? await db.query.progress.findMany({
              where: (p, { eq: eq_, and: a, inArray }) =>
                a(eq_(p.userId, user.sub), inArray(p.lectureId, lectureIds)),
            })
          : [];

      const totalLectures = lectureIds.length;
      const completedLectures = progressRecords.filter(
        (p) => p.status === "completed"
      ).length;

      return {
        ...enrollment,
        progress: {
          total: totalLectures,
          completed: completedLectures,
          percentage:
            totalLectures > 0
              ? Math.round((completedLectures / totalLectures) * 100)
              : 0,
        },
      };
    })
  );

  return json(courseData);
});
