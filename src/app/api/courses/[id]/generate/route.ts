import { db } from "@/lib/db/drizzle";
import { generationJobs, courseUploads } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { json, error, withOwner } from "@/lib/api-utils";
import { generateCourseLectures } from "@/lib/ai/generate-course-lectures";

export const POST = withOwner(async (req, { user, params, course }) => {
  const courseId = params!.id;

  // Check uploads exist
  const uploads = await db.query.courseUploads.findMany({
    where: (u, { eq: e }) => e(u.courseId, courseId),
  });
  if (uploads.length === 0) {
    return error("No source materials uploaded. Upload files first.");
  }

  // Check no job is currently processing
  const activeJob = await db.query.generationJobs.findFirst({
    where: (j, { eq: e, and: a }) =>
      a(e(j.courseId, courseId), e(j.status, "processing")),
  });
  if (activeJob) {
    return error("Generation already in progress", 409);
  }

  // Create job
  const [job] = await db
    .insert(generationJobs)
    .values({ courseId })
    .returning();

  // Fire-and-forget
  generateCourseLectures(courseId, job.id).catch((err) =>
    console.error("Background lecture generation failed:", err)
  );

  return json(job, 201);
});

export const GET = withOwner(async (req, { user, params, course }) => {
  const courseId = params!.id;

  const latestJob = await db.query.generationJobs.findFirst({
    where: (j, { eq: e }) => e(j.courseId, courseId),
    orderBy: (j) => desc(j.createdAt),
  });

  return json(latestJob || null);
});
