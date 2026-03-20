import { db } from "@/lib/db/drizzle";
import { courseUploads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { json, error, withOwner } from "@/lib/api-utils";
import { deleteFromR2 } from "@/lib/r2/client";

export const DELETE = withOwner(async (req, { user, params, course }) => {
  const { id: courseId, uploadId } = params!;

  const upload = await db.query.courseUploads.findFirst({
    where: (u, { eq: e, and: a }) =>
      a(e(u.id, uploadId), e(u.courseId, courseId)),
  });

  if (!upload) return error("Upload not found", 404);

  await deleteFromR2(upload.r2Key);
  await db.delete(courseUploads).where(eq(courseUploads.id, uploadId));

  return json({ message: "Upload deleted" });
});
