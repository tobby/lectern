import { db } from "@/lib/db/drizzle";
import { messagePacks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { json, error, withAdmin } from "@/lib/api-utils";

export const PATCH = withAdmin(async (req, { params }) => {
  const id = params!.id;
  const body = await req.json();

  const existing = await db.query.messagePacks.findFirst({
    where: (p, { eq: e }) => e(p.id, id),
  });

  if (!existing) return error("Pack not found", 404);

  const [updated] = await db
    .update(messagePacks)
    .set({
      ...(body.name && { name: body.name.trim() }),
      ...(body.messages !== undefined && { messages: body.messages }),
      ...(body.price !== undefined && { price: String(body.price) }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    })
    .where(eq(messagePacks.id, id))
    .returning();

  return json(updated);
});

export const DELETE = withAdmin(async (_req, { params }) => {
  const id = params!.id;

  const existing = await db.query.messagePacks.findFirst({
    where: (p, { eq: e }) => e(p.id, id),
  });

  if (!existing) return error("Pack not found", 404);

  await db.delete(messagePacks).where(eq(messagePacks.id, id));
  return json({ message: "Pack deleted" });
});
