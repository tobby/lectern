import { db } from "@/lib/db/drizzle";
import { courses } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { json, error, withAuth, withAdmin } from "@/lib/api-utils";
import { v4 as uuidv4 } from "uuid";

// List courses — admin sees all, students see published public only
export const GET = withAuth(async (req, { user }) => {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const offset = (page - 1) * limit;
  const adminMode = url.searchParams.get("admin") === "true";

  const allCourses = await db.query.courses.findMany({
    where: adminMode && user.isAdmin
      ? undefined
      : (c, { eq: e, and: a }) =>
          a(e(c.status, "published"), e(c.isPublic, true)),
    orderBy: (c) => desc(c.createdAt),
    limit,
    offset,
    with: {
      institution: true,
    },
  });

  return json({ courses: allCourses, page, limit });
});

// Admin: create course
export const POST = withAdmin(async (req, { user }) => {
  const body = await req.json();
  const { title, description, isPublic, institutionId } = body;

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
    })
    .returning();

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
