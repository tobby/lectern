import { db } from "@/lib/db/drizzle";
import { courses, enrollments } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { json, error, withAuth } from "@/lib/api-utils";
import { v4 as uuidv4 } from "uuid";

// List courses — admin sees all, students see published public only
export const GET = withAuth(async (req, { user }) => {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const offset = (page - 1) * limit;
  const adminMode = url.searchParams.get("admin") === "true";
  const mineMode = url.searchParams.get("mine") === "true";

  const allCourses = await db.query.courses.findMany({
    where: mineMode
      ? (c, { eq: e, and: a }) => a(e(c.createdBy, user.sub), e(c.source, "user"))
      : adminMode && user.isAdmin
        ? undefined
        : (c, { eq: e, and: a }) =>
            a(e(c.status, "published"), e(c.isPublic, true), e(c.source, "admin")),
    orderBy: (c) => desc(c.createdAt),
    limit,
    offset,
    with: {
      institution: true,
    },
  });

  return json({ courses: allCourses, page, limit });
});

// Create course (any authenticated user)
export const POST = withAuth(async (req, { user }) => {
  const body = await req.json();
  const { title, description, isPublic, institutionId, source } = body;

  if (!title || typeof title !== "string") {
    return error("Course title is required");
  }

  const inviteCode = isPublic === false ? generateInviteCode() : null;

  const [course] = await db
    .insert(courses)
    .values({
      title: title.trim(),
      description: description?.trim() || null,
      isPublic: isPublic !== false,
      inviteCode,
      status: "draft",
      institutionId: institutionId || null,
      createdBy: user.sub,
      source: source === "user" ? "user" : "admin",
    })
    .returning();

  // Auto-enroll creator for user-created courses
  if (source === "user") {
    await db.insert(enrollments).values({
      userId: user.sub,
      courseId: course.id,
    });
  }

  return json(course, 201);
});

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 12; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
