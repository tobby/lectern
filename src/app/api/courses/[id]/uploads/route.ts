import { db } from "@/lib/db/drizzle";
import { courseUploads } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { json, error, withOwner, userRateLimit } from "@/lib/api-utils";
import { uploadToR2 } from "@/lib/r2/client";

const ALLOWED_TYPES = ["pdf", "docx", "pptx", "txt"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const POST = withOwner(async (req, { user, params, course }) => {
  const courseId = params!.id;

  const rateLimited = userRateLimit("upload", 20, 60 * 60 * 1000, user.sub);
  if (rateLimited) return rateLimited;

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (files.length === 0) return error("At least one file is required");

  const created = [];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return error(`File "${file.name}" exceeds 50MB limit`);
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_TYPES.includes(ext)) {
      return error(
        `File "${file.name}" has unsupported type. Allowed: ${ALLOWED_TYPES.join(", ")}`
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const r2Key = `courses/${courseId}/uploads/${timestamp}-${file.name}`;

    await uploadToR2(r2Key, buffer, file.type);

    const [upload] = await db
      .insert(courseUploads)
      .values({
        courseId,
        fileName: file.name,
        r2Key,
        fileType: ext,
        fileSizeBytes: file.size,
      })
      .returning();

    created.push(upload);
  }

  return json(created, 201);
});

export const GET = withOwner(async (req, { user, params, course }) => {
  const courseId = params!.id;

  const uploads = await db.query.courseUploads.findMany({
    where: (u, { eq: e }) => e(u.courseId, courseId),
    orderBy: (u) => asc(u.createdAt),
  });

  return json(uploads);
});
