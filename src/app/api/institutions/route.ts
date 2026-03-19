import { db } from "@/lib/db/drizzle";
import { institutions } from "@/lib/db/schema";
import { json, error, withAdmin } from "@/lib/api-utils";

export const GET = withAdmin(async () => {
  const all = await db.query.institutions.findMany({
    orderBy: (i, { desc }) => desc(i.createdAt),
  });
  return json(all);
});

export const POST = withAdmin(async (req) => {
  const body = await req.json();
  const { name, country, website, logoUrl } = body;

  if (!name || typeof name !== "string") {
    return error("Institution name is required");
  }

  const [institution] = await db
    .insert(institutions)
    .values({
      name: name.trim(),
      country: country?.trim() || null,
      website: website?.trim() || null,
      logoUrl: logoUrl || null,
    })
    .returning();

  return json(institution, 201);
});
