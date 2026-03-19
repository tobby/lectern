import { rotateTokens } from "@/lib/auth/session";
import { json, error } from "@/lib/api-utils";

export async function POST() {
  try {
    await rotateTokens();
    return json({ message: "Tokens refreshed" });
  } catch {
    return error("Invalid or expired refresh token", 401);
  }
}
