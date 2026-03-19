// Phase 1: Console-based email (logs links to terminal)
// Replace with AWS SES in production

const APP_URL = process.env.APP_URL || "http://localhost:3000";

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  const link = `${APP_URL}/verify-email?token=${token}`;
  console.log(`\n📧 VERIFICATION EMAIL for ${email}`);
  console.log(`   Link: ${link}\n`);
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<void> {
  const link = `${APP_URL}/reset-password?token=${token}`;
  console.log(`\n📧 PASSWORD RESET EMAIL for ${email}`);
  console.log(`   Link: ${link}\n`);
}
