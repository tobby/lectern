import { db } from "@/lib/db/drizzle";
import { messagePackPurchases, messagePacks, enrollments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { json, error, withAuth } from "@/lib/api-utils";

export const POST = withAuth(async (req, { user, params }) => {
  const courseId = params!.id;
  const { packId } = await req.json();

  if (!packId) return error("Pack ID is required");

  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
  if (!PAYSTACK_SECRET) return error("Payment provider not configured", 500);

  // Verify enrollment
  const enrollment = await db.query.enrollments.findFirst({
    where: (e, { eq: eq_, and: a }) =>
      a(eq_(e.userId, user.sub), eq_(e.courseId, courseId)),
  });

  if (!enrollment) return error("Not enrolled in this course", 403);

  // Get pack
  const pack = await db.query.messagePacks.findFirst({
    where: (p, { eq: e, and: a }) => a(e(p.id, packId), e(p.isActive, true)),
  });

  if (!pack) return error("Pack not found or inactive", 404);

  // Create pending purchase
  const [purchase] = await db
    .insert(messagePackPurchases)
    .values({
      userId: user.sub,
      courseId,
      packId,
      messagesAdded: pack.messages,
      amountPaid: pack.price,
      status: "pending",
    })
    .returning();

  // Initialize Paystack transaction
  const callbackUrl = `${process.env.APP_URL || "http://localhost:3000"}/payment/callback`;
  const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      amount: Math.round(Number(pack.price) * 100), // Paystack uses kobo/cents
      reference: purchase.id,
      callback_url: callbackUrl,
      metadata: {
        purchaseId: purchase.id,
        courseId,
        packId,
        userId: user.sub,
      },
    }),
  });

  if (!paystackRes.ok) {
    // Mark purchase as failed since payment couldn't be initialized
    await db
      .update(messagePackPurchases)
      .set({ status: "failed" })
      .where(eq(messagePackPurchases.id, purchase.id));

    console.error("Paystack init failed:", await paystackRes.text());
    return error("Failed to initialize payment", 502);
  }

  const paystackData = await paystackRes.json();

  // Store the Paystack reference on the purchase
  await db
    .update(messagePackPurchases)
    .set({ paystackReference: paystackData.data.reference })
    .where(eq(messagePackPurchases.id, purchase.id));

  return json({
    purchase: { ...purchase, paystackReference: paystackData.data.reference },
    paymentUrl: paystackData.data.authorization_url,
    message: "Redirect to payment URL to complete purchase.",
  }, 201);
});
