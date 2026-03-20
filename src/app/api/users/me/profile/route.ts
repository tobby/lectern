import { db } from "@/lib/db/drizzle";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { json, error, withAuth } from "@/lib/api-utils";

const VALID_LEVELS = ["high_school", "undergraduate", "postgraduate", "professional"];
const VALID_GOALS = ["exam_prep", "deep_understanding", "quick_review"];

export const GET = withAuth(async (_req, { user }) => {
  const profile = await db.query.users.findFirst({
    where: (u, { eq: e }) => e(u.id, user.sub),
    columns: {
      id: true,
      fullName: true,
      email: true,
      educationLevel: true,
      fieldOfStudy: true,
      learningGoal: true,
    },
  });

  return json(profile);
});

export const PATCH = withAuth(async (req, { user }) => {
  const body = await req.json();
  const { fullName, educationLevel, fieldOfStudy, learningGoal } = body;

  if (educationLevel && !VALID_LEVELS.includes(educationLevel)) {
    return error("Invalid education level");
  }
  if (learningGoal && !VALID_GOALS.includes(learningGoal)) {
    return error("Invalid learning goal");
  }

  const [updated] = await db
    .update(users)
    .set({
      ...(fullName !== undefined && fullName?.trim() && { fullName: fullName.trim() }),
      ...(educationLevel !== undefined && { educationLevel }),
      ...(fieldOfStudy !== undefined && { fieldOfStudy: fieldOfStudy?.trim() || null }),
      ...(learningGoal !== undefined && { learningGoal }),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.sub))
    .returning({
      educationLevel: users.educationLevel,
      fieldOfStudy: users.fieldOfStudy,
      learningGoal: users.learningGoal,
    });

  return json(updated);
});
