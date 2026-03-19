import { db } from "@/lib/db/drizzle";
import { institutions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { json, error, withAdmin } from "@/lib/api-utils";

export const PATCH = withAdmin(async (req, { params }) => {
  const id = params!.id;
  const body = await req.json();

  const existing = await db.query.institutions.findFirst({
    where: (i, { eq: e }) => e(i.id, id),
  });

  if (!existing) return error("Institution not found", 404);

  const [updated] = await db
    .update(institutions)
    .set({
      ...(body.name && { name: body.name.trim() }),
      ...(body.country !== undefined && { country: body.country?.trim() || null }),
      ...(body.website !== undefined && { website: body.website?.trim() || null }),
      ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl || null }),
    })
    .where(eq(institutions.id, id))
    .returning();

  return json(updated);
});

export const DELETE = withAdmin(async (_req, { params }) => {
  const id = params!.id;

  const existing = await db.query.institutions.findFirst({
    where: (i, { eq: e }) => e(i.id, id),
  });

  if (!existing) return error("Institution not found", 404);

  // Cascade rule: nullify institution_id on courses
  await db.delete(institutions).where(eq(institutions.id, id));

  return json({ message: "Institution deleted" });
});
