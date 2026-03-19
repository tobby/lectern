import { db } from "@/lib/db/drizzle";
import { messagePackPurchases, enrollments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { json, error } from "@/lib/api-utils";
import crypto from "crypto";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("PAYSTACK_WEBHOOK_SECRET not configured");
    return error("Webhook not configured", 500);
  }

  // Verify Paystack HMAC signature
  const signature = req.headers.get("x-paystack-signature");
  if (!signature) return error("Missing signature", 400);

  const rawBody = await req.text();
  const hash = crypto
    .createHmac("sha512", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  if (hash !== signature) return error("Invalid signature", 401);

  const event = JSON.parse(rawBody);

  if (event.event !== "charge.success") {
    return json({ message: "Event ignored" });
  }

  const reference = event.data.reference;

  // Find pending purchase
  const purchase = await db.query.messagePackPurchases.findFirst({
    where: (p, { eq: e, and: a }) =>
      a(e(p.paystackReference, reference), e(p.status, "pending")),
  });

  if (!purchase) {
    // Try matching by purchase ID as reference
    const purchaseById = await db.query.messagePackPurchases.findFirst({
      where: (p, { eq: e, and: a }) =>
        a(e(p.id, reference), e(p.status, "pending")),
    });

    if (!purchaseById) {
      return json({ message: "Purchase not found or already processed" });
    }

    // Update purchase
    await db
      .update(messagePackPurchases)
      .set({
        status: "completed",
        paystackReference: reference,
      })
      .where(eq(messagePackPurchases.id, purchaseById.id));

    // Credit quota
    const enrollment = await db.query.enrollments.findFirst({
      where: (e, { eq: eq_, and: a }) =>
        a(
          eq_(e.userId, purchaseById.userId),
          eq_(e.courseId, purchaseById.courseId)
        ),
    });

    if (enrollment) {
      await db
        .update(enrollments)
        .set({
          messagesQuota: enrollment.messagesQuota + purchaseById.messagesAdded,
        })
        .where(eq(enrollments.id, enrollment.id));
    }

    return json({ message: "Purchase completed" });
  }

  // Update purchase status
  await db
    .update(messagePackPurchases)
    .set({ status: "completed", paystackReference: reference })
    .where(eq(messagePackPurchases.id, purchase.id));

  // Credit quota
  const enrollment = await db.query.enrollments.findFirst({
    where: (e, { eq: eq_, and: a }) =>
      a(eq_(e.userId, purchase.userId), eq_(e.courseId, purchase.courseId)),
  });

  if (enrollment) {
    await db
      .update(enrollments)
      .set({
        messagesQuota: enrollment.messagesQuota + purchase.messagesAdded,
      })
      .where(eq(enrollments.id, enrollment.id));
  }

  return json({ message: "Purchase completed" });
}
