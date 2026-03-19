import { db } from "@/lib/db/drizzle";
import { courseUploads } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { json, error, withAdmin } from "@/lib/api-utils";
import { deleteFromR2 } from "@/lib/r2/client";

export const DELETE = withAdmin(async (req, { user, params }) => {
  const { id: courseId, uploadId } = params!;

  const course = await db.query.courses.findFirst({
    where: (c, { eq: e }) => e(c.id, courseId),
  });
  if (!course) return error("Course not found", 404);
  if (course.createdBy !== user.sub) return error("Forbidden", 403);

  const upload = await db.query.courseUploads.findFirst({
    where: (u, { eq: e, and: a }) =>
      a(e(u.id, uploadId), e(u.courseId, courseId)),
  });

  if (!upload) return error("Upload not found", 404);

  await deleteFromR2(upload.r2Key);
  await db.delete(courseUploads).where(eq(courseUploads.id, uploadId));

  return json({ message: "Upload deleted" });
});
