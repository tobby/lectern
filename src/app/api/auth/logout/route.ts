import { destroySession, requireAuth } from "@/lib/auth/session";
import { json, error } from "@/lib/api-utils";

export async function POST() {
  try {
    const user = await requireAuth();
    await destroySession(user.sub);
    return json({ message: "Logged out" });
  } catch {
    return error("Unauthorized", 401);
  }
}
