import { db } from "@/lib/db/drizzle";
import { messagePacks } from "@/lib/db/schema";
import { json, error, withAuth, withAdmin } from "@/lib/api-utils";

// List packs — admin sees all, students see active only
export const GET = withAuth(async (req, { user }) => {
  const url = new URL(req.url);
  const adminMode = url.searchParams.get("admin") === "true";

  const packs = await db.query.messagePacks.findMany({
    where: adminMode && user.isAdmin
      ? undefined
      : (p, { eq }) => eq(p.isActive, true),
    orderBy: (p, { asc }) => asc(p.messages),
  });
  return json(packs);
});

// Create pack (admin only)
export const POST = withAdmin(async (req) => {
  const body = await req.json();
  const { name, messages, price } = body;

  if (!name || typeof name !== "string") return error("Pack name is required");
  if (!messages || typeof messages !== "number" || messages <= 0)
    return error("Messages must be a positive number");
  if (!price || isNaN(Number(price)) || Number(price) <= 0)
    return error("Price must be a positive number");

  const [pack] = await db
    .insert(messagePacks)
    .values({
      name: name.trim(),
      messages,
      price: String(price),
    })
    .returning();

  return json(pack, 201);
});
