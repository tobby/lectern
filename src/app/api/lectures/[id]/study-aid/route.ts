import { db } from "@/lib/db/drizzle";
import { studyAids } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { json, error, withAuth, withAdmin } from "@/lib/api-utils";

// Get study aid for a lecture (any authenticated user)
export const GET = withAuth(async (_req, { params }) => {
  const lectureId = params!.id;

  const lecture = await db.query.lectures.findFirst({
    where: (l, { eq: e }) => e(l.id, lectureId),
  });

  if (!lecture) return error("Lecture not found", 404);

  if (lecture.aiStatus === "processing") {
    return json({ status: "processing", message: "Study aid is being generated, check back shortly." });
  }

  if (lecture.aiStatus === "failed") {
    return json({ status: "failed", message: "Content unavailable. Generation failed." });
  }

  if (lecture.aiStatus === "pending") {
    return json({ status: "pending", message: "No materials uploaded yet." });
  }

  const studyAid = await db.query.studyAids.findFirst({
    where: (sa, { eq: e }) => e(sa.lectureId, lectureId),
  });

  if (!studyAid) return error("Study aid not found", 404);

  return json({ status: "done", studyAid });
});

// Admin: edit study aid content
export const PATCH = withAdmin(async (req, { user, params }) => {
  const lectureId = params!.id;
  const body = await req.json();

  const lecture = await db.query.lectures.findFirst({
    where: (l, { eq: e }) => e(l.id, lectureId),
    with: { module: { with: { course: true } } },
  });

  if (!lecture) return error("Lecture not found", 404);
  if (lecture.module.course.createdBy !== user.sub)
    return error("Forbidden", 403);

  const studyAid = await db.query.studyAids.findFirst({
    where: (sa, { eq: e }) => e(sa.lectureId, lectureId),
  });

  if (!studyAid) return error("Study aid not found", 404);

  const [updated] = await db
    .update(studyAids)
    .set({
      ...(body.keyConcepts !== undefined && { keyConcepts: body.keyConcepts }),
      ...(body.areasOfConcentration !== undefined && {
        areasOfConcentration: body.areasOfConcentration,
      }),
      ...(body.examQuestions !== undefined && {
        examQuestions: body.examQuestions,
      }),
    })
    .where(eq(studyAids.id, studyAid.id))
    .returning();

  return json(updated);
});
