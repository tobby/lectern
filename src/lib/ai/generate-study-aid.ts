import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db/drizzle";
import { lectures, materials, studyAids } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getObjectBuffer } from "@/lib/r2/client";
import { extractText } from "./extract-text";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are an expert academic study aid generator for MBA programs. Your role is to analyze lecture materials and produce high-quality study aids.

The following content may come from multiple source materials and may contain overlapping or repeated concepts. Identify and consolidate duplicate ideas — each concept should appear only once, expressed in its clearest form. Prioritize depth over repetition. For exam questions, ensure no two questions test the same underlying concept even if that concept appears multiple times across the source materials.

You must output valid markdown with the following three sections, using the exact headers shown:

## Key Concepts
Generate 5–8 core ideas from the material with brief but substantive explanations. Each concept should have a bold title followed by a clear explanation paragraph.

## Areas of Concentration
Generate 3–5 priority topics the student must understand deeply. For each area, explain why it matters and what aspects to focus on.

## Practice Questions

### Multiple Choice Questions
Generate 10 MCQ questions. Format each as:
**Q1.** [Question text]
- A) [Option]
- B) [Option]
- C) [Option]
- D) [Option]

**Answer:** [Letter] — [Brief explanation]

### Short Answer Questions
Generate 5 short answer questions. Format each as:
**Q1.** [Question text]

**Answer:** [2-3 sentence answer]

### Case Analysis Questions
Generate 2 case-based questions with a brief scenario followed by analytical questions.

**Answer:** [Detailed analysis]

### Essay Questions
Generate 2 essay questions that require comprehensive responses.

**Answer:** [Key points the answer should cover]`;

export async function generateStudyAid(lectureId: string): Promise<void> {
  try {
    // Set status to processing
    await db
      .update(lectures)
      .set({ aiStatus: "processing" })
      .where(eq(lectures.id, lectureId));

    // Fetch all materials for the lecture in upload order
    const lectureMaterials = await db.query.materials.findMany({
      where: (m, { eq: e }) => e(m.lectureId, lectureId),
      orderBy: (m) => asc(m.createdAt),
    });

    if (lectureMaterials.length === 0) {
      await db
        .update(lectures)
        .set({ aiStatus: "pending" })
        .where(eq(lectures.id, lectureId));
      return;
    }

    // Extract text from all materials
    const textSections: string[] = [];
    for (const material of lectureMaterials) {
      const buffer = await getObjectBuffer(material.r2Key);
      const text = await extractText(buffer, material.fileType);
      textSections.push(
        `--- Source: ${material.fileName} ---\n\n${text}`
      );
    }

    const combinedText = textSections.join("\n\n");

    // Generate study aid using Claude Sonnet 4
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Analyze the following lecture materials and generate a comprehensive study aid:\n\n${combinedText}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    const generatedText = content.text;

    // Parse sections from the generated markdown
    const keyConcepts = extractSection(generatedText, "Key Concepts");
    const areasOfConcentration = extractSection(
      generatedText,
      "Areas of Concentration"
    );
    const examQuestions = extractSection(generatedText, "Practice Questions");

    // Upsert study aid
    const existing = await db.query.studyAids.findFirst({
      where: (sa, { eq: e }) => e(sa.lectureId, lectureId),
    });

    if (existing) {
      await db
        .update(studyAids)
        .set({
          keyConcepts,
          areasOfConcentration,
          examQuestions,
          generatedAt: new Date(),
        })
        .where(eq(studyAids.id, existing.id));
    } else {
      await db.insert(studyAids).values({
        lectureId,
        keyConcepts,
        areasOfConcentration,
        examQuestions,
      });
    }

    // Set status to done
    await db
      .update(lectures)
      .set({ aiStatus: "done" })
      .where(eq(lectures.id, lectureId));
  } catch (error) {
    console.error("Study aid generation failed:", error);
    await db
      .update(lectures)
      .set({ aiStatus: "failed" })
      .where(eq(lectures.id, lectureId));
  }
}

function extractSection(markdown: string, sectionTitle: string): string {
  const regex = new RegExp(
    `## ${sectionTitle}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`
  );
  const match = markdown.match(regex);
  return match ? match[1].trim() : "";
}
