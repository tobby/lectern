import { db } from "@/lib/db/drizzle";
import { materials, lectures, modules } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { json, error, withAdmin, userRateLimit } from "@/lib/api-utils";
import { uploadToR2 } from "@/lib/r2/client";
import { generateStudyAid } from "@/lib/ai/generate-study-aid";

const ALLOWED_TYPES = ["pdf", "docx", "pptx", "txt"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const POST = withAdmin(async (req, { user, params }) => {
  const lectureId = params!.id;

  // Rate limit: 20 uploads per hour per user
  const rateLimited = userRateLimit("upload", 20, 60 * 60 * 1000, user.sub);
  if (rateLimited) return rateLimited;

  const lecture = await db.query.lectures.findFirst({
    where: (l, { eq: e }) => e(l.id, lectureId),
    with: { module: { with: { course: true } } },
  });

  if (!lecture) return error("Lecture not found", 404);
  if (lecture.module.course.createdBy !== user.sub)
    return error("Forbidden", 403);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return error("File is required");

  if (file.size > MAX_FILE_SIZE) {
    return error("File size exceeds 50MB limit");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_TYPES.includes(ext)) {
    return error(`Unsupported file type. Allowed: ${ALLOWED_TYPES.join(", ")}`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const r2Key = `courses/${lecture.module.course.id}/lectures/${lectureId}/${file.name}`;

  // Upload to R2
  await uploadToR2(r2Key, buffer, file.type);

  // Save metadata
  const [material] = await db
    .insert(materials)
    .values({
      lectureId,
      fileName: file.name,
      r2Key,
      fileType: ext,
      fileSizeBytes: file.size,
    })
    .returning();

  // Fire-and-forget: trigger AI generation
  generateStudyAid(lectureId).catch((err) =>
    console.error("Background study aid generation failed:", err)
  );

  return json(material, 201);
});
