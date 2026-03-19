import { db } from "@/lib/db/drizzle";
import {
  chatSessions,
  chatMessages,
  studyAids,
  enrollments,
} from "@/lib/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { json, error, withAuth, userRateLimit } from "@/lib/api-utils";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

// GET: retrieve or create chat session + full message history
export const GET = withAuth(async (_req, { user, params }) => {
  const lectureId = params!.id;

  let session = await db.query.chatSessions.findFirst({
    where: (s, { eq: e, and: a }) =>
      a(e(s.userId, user.sub), e(s.lectureId, lectureId)),
  });

  if (!session) {
    const [created] = await db
      .insert(chatSessions)
      .values({ userId: user.sub, lectureId })
      .returning();
    session = created;
  }

  const messages = await db.query.chatMessages.findMany({
    where: (m, { eq: e }) => e(m.sessionId, session!.id),
    orderBy: (m) => asc(m.createdAt),
  });

  return json({ session, messages });
});

// POST: send message, stream AI response
export const POST = withAuth(async (req, { user, params }) => {
  const lectureId = params!.id;

  // Rate limit: 30 messages per minute per user
  const rateLimited = userRateLimit("chat", 30, 60 * 1000, user.sub);
  if (rateLimited) return rateLimited;

  const { message } = await req.json();

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return error("Message is required");
  }

  // Check enrollment and quota — need to find which course this lecture belongs to
  const lecture = await db.query.lectures.findFirst({
    where: (l, { eq: e }) => e(l.id, lectureId),
    with: { module: true },
  });

  if (!lecture) return error("Lecture not found", 404);

  const enrollment = await db.query.enrollments.findFirst({
    where: (e, { eq: eq_, and: a }) =>
      a(eq_(e.userId, user.sub), eq_(e.courseId, lecture.module.courseId)),
  });

  if (!enrollment) return error("Not enrolled in this course", 403);

  if (enrollment.messagesUsed >= enrollment.messagesQuota) {
    return error("Message quota exceeded. Purchase a top-up pack to continue.", 402);
  }

  // Get or create session
  let session = await db.query.chatSessions.findFirst({
    where: (s, { eq: e, and: a }) =>
      a(e(s.userId, user.sub), e(s.lectureId, lectureId)),
  });

  if (!session) {
    const [created] = await db
      .insert(chatSessions)
      .values({ userId: user.sub, lectureId })
      .returning();
    session = created;
  }

  // Save user message
  await db.insert(chatMessages).values({
    sessionId: session.id,
    role: "user",
    content: message.trim(),
  });

  // Get study aid for context
  const studyAid = await db.query.studyAids.findFirst({
    where: (sa, { eq: e }) => e(sa.lectureId, lectureId),
  });

  // Get last 10 messages for conversation history
  const recentMessages = await db.query.chatMessages.findMany({
    where: (m, { eq: e }) => e(m.sessionId, session!.id),
    orderBy: (m) => desc(m.createdAt),
    limit: 10,
  });

  const conversationHistory = recentMessages
    .reverse()
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const systemPrompt = buildChatSystemPrompt(studyAid);

  // Stream response
  const stream = await anthropic.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: systemPrompt,
    messages: conversationHistory,
  });

  // Create a ReadableStream to send to the client
  const encoder = new TextEncoder();
  let fullResponse = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullResponse += event.delta.text;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            );
          }
        }

        // Save complete assistant message
        await db.insert(chatMessages).values({
          sessionId: session!.id,
          role: "assistant",
          content: fullResponse,
        });

        // Increment messages used
        await db
          .update(enrollments)
          .set({ messagesUsed: enrollment.messagesUsed + 1 })
          .where(eq(enrollments.id, enrollment.id));

        // Update session activity
        await db
          .update(chatSessions)
          .set({ lastActiveAt: new Date() })
          .where(eq(chatSessions.id, session!.id));

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        console.error("Chat stream error:", err);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "Stream failed" })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

function buildChatSystemPrompt(
  studyAid: { keyConcepts: string | null; areasOfConcentration: string | null; examQuestions: string | null } | undefined
): string {
  let prompt = `You are a helpful MBA study assistant. You answer questions strictly based on the lecture material provided below. Do not answer questions outside the scope of this lecture content. If asked about something not covered in the material, politely redirect the student to the relevant topic areas.

Be concise, accurate, and educational. Use examples from the material when possible.`;

  if (studyAid) {
    prompt += `\n\n--- LECTURE STUDY AID ---\n`;
    if (studyAid.keyConcepts) {
      prompt += `\n## Key Concepts\n${studyAid.keyConcepts}\n`;
    }
    if (studyAid.areasOfConcentration) {
      prompt += `\n## Areas of Concentration\n${studyAid.areasOfConcentration}\n`;
    }
    if (studyAid.examQuestions) {
      prompt += `\n## Practice Questions\n${studyAid.examQuestions}\n`;
    }
  }

  return prompt;
}
