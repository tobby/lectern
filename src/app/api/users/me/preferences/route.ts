import { db } from "@/lib/db/drizzle";
import { userPreferences } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { json, error, withAuth } from "@/lib/api-utils";

const DEFAULT_PREFERENCES = {
  answer_mode: "hidden" as const,
  question_order: "default" as const,
  question_filter: "all" as const,
  view_mode: "detailed" as const,
};

export const GET = withAuth(async (_req, { user }) => {
  const prefs = await db.query.userPreferences.findFirst({
    where: (p, { eq: e }) => e(p.userId, user.sub),
  });

  return json(prefs?.preferences || DEFAULT_PREFERENCES);
});

export const PATCH = withAuth(async (req, { user }) => {
  const body = await req.json();

  // Validate preference values
  const validAnswerModes = ["hidden", "visible"];
  const validQuestionOrders = ["default", "randomized"];
  const validQuestionFilters = ["all", "mcq", "short_answer", "essay"];
  const validViewModes = ["detailed", "compact"];

  if (body.answer_mode && !validAnswerModes.includes(body.answer_mode)) {
    return error("Invalid answer_mode");
  }
  if (body.question_order && !validQuestionOrders.includes(body.question_order)) {
    return error("Invalid question_order");
  }
  if (body.question_filter && !validQuestionFilters.includes(body.question_filter)) {
    return error("Invalid question_filter");
  }
  if (body.view_mode && !validViewModes.includes(body.view_mode)) {
    return error("Invalid view_mode");
  }

  const existing = await db.query.userPreferences.findFirst({
    where: (p, { eq: e }) => e(p.userId, user.sub),
  });

  const newPrefs = {
    ...DEFAULT_PREFERENCES,
    ...(existing?.preferences as object || {}),
    ...body,
  };

  if (existing) {
    const [updated] = await db
      .update(userPreferences)
      .set({ preferences: newPrefs, updatedAt: new Date() })
      .where(eq(userPreferences.id, existing.id))
      .returning();
    return json(updated.preferences);
  }

  const [created] = await db
    .insert(userPreferences)
    .values({ userId: user.sub, preferences: newPrefs })
    .returning();

  return json(created.preferences);
});
