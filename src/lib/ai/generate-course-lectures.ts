import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db/drizzle";
import {
  courseUploads,
  generationJobs,
  lectures,
  studyAids,
} from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getObjectBuffer } from "@/lib/r2/client";
import { extractText } from "./extract-text";
import { getOrCreateDefaultModule } from "@/lib/db/default-module";

const anthropic = new Anthropic();

const MAX_CHUNK_CHARS = 450000; // ~112K tokens — leaves room for prompts

// ── Prompts ──

const TOPIC_EXTRACTION_PROMPT = `You are an academic content analyzer. List ALL distinct topics, concepts, and subject areas covered in the provided text.

Return ONLY valid JSON (no markdown wrapping):
{
  "topics": [
    {
      "name": "Topic name",
      "summary": "2-3 sentence summary of what this topic covers",
      "keyTerms": ["term1", "term2", "term3"]
    }
  ]
}

Be thorough — do not miss any topic. Include both major themes and specific subtopics.`;

const OUTLINE_PROMPT = `You are an expert university lecturer designing a course curriculum for MBA students.

Analyze the provided content and determine the optimal way to divide it into 3-6 comprehensive lectures.

Return ONLY valid JSON (no markdown wrapping):
{
  "lectures": [
    {
      "title": "Lecture title",
      "description": "2-3 sentence description of what this lecture covers and its learning objectives",
      "topicsCovered": ["topic1", "topic2", "topic3"]
    }
  ]
}

Guidelines:
- Create 3-6 lectures maximum. Fewer lectures = more depth per lecture.
- Each lecture should cover a coherent, self-contained topic.
- Follow a logical pedagogical sequence.
- If content from different sources covers the same topic, consolidate.
- List the specific topics each lecture should cover in topicsCovered.`;

const LECTURE_PROMPT = `You are an expert university lecturer writing comprehensive lesson notes for MBA students. A student with ZERO prior knowledge should be able to study ONLY your notes and pass the university exam with flying colors.

You are generating content for a SINGLE lecture. Write EXTENSIVE, DETAILED content — do NOT summarize or abbreviate.

Return ONLY valid JSON (no markdown wrapping):
{
  "keyConcepts": "comprehensive lesson notes in markdown",
  "areasOfConcentration": "exam focus areas in markdown",
  "examQuestions": "practice questions in markdown"
}

## keyConcepts — COMPREHENSIVE LESSON NOTES

This is the MAIN teaching content. For each concept (8-12 per lecture):

**Concept Title**

Write 4-8 paragraphs covering:
1. Clear definition with key terminology bolded
2. Detailed theoretical explanation — explain the WHY, not just the WHAT
3. Step-by-step processes, formulas, or frameworks where applicable
4. Real-world examples and applications (use specific MBA-relevant scenarios)
5. Common misconceptions and pitfalls
6. How this concept connects to other topics in the course

Use rich formatting:
- Markdown tables for comparisons (| Header | Header |)
- Mermaid diagrams for processes/flows (using \`\`\`mermaid code blocks)
- Numbered steps for procedures
- Bold key terms on first use

Example Mermaid diagram:
\`\`\`mermaid
graph TD
    A[Start] --> B[Step 1]
    B --> C[Step 2]
    C --> D[Result]
\`\`\`

## areasOfConcentration — EXAM FOCUS AREAS

For each area (5-7 per lecture), write a substantial paragraph covering:
- What examiners specifically test on this topic
- Common mistakes students make in exams
- How to structure a strong exam answer
- Key terms and definitions that MUST appear in answers
- Specific frameworks or models to reference

## examQuestions — PRACTICE QUESTIONS

### Multiple Choice Questions
10 MCQ questions testing UNDERSTANDING and APPLICATION:
**Q1.** [Scenario-based question]
- A) [Plausible option]
- B) [Plausible option]
- C) [Plausible option]
- D) [Plausible option]

**Answer:** [Letter] — [Thorough explanation of why correct AND why others are wrong]

### Short Answer Questions
5 questions requiring concept application. Each model answer should be 3-5 sentences.

**Q1.** [Question]
**Answer:** [Detailed model answer]

### Case Analysis Questions
2 realistic MBA case scenarios (3-4 paragraph scenario) with analytical questions.

**Answer:** [Comprehensive analysis, 4-6 paragraphs]

### Essay Questions
2 essay questions mirroring actual university exam questions.

**Answer:** [Structured essay with key points, arguments, conclusion — 5-8 paragraphs]`;

// ── Types ──

interface LectureOutline {
  title: string;
  description: string;
  topicsCovered: string[];
}

interface LectureContent {
  keyConcepts: string;
  areasOfConcentration: string;
  examQuestions: string;
}

interface TopicEntry {
  name: string;
  summary: string;
  keyTerms: string[];
}

// ── Utilities ──

function chunkText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining);
      break;
    }

    // Find a paragraph break near the max to split cleanly
    let splitAt = remaining.lastIndexOf("\n\n", maxChars);
    if (splitAt < maxChars * 0.5) {
      // No good paragraph break — try single newline
      splitAt = remaining.lastIndexOf("\n", maxChars);
    }
    if (splitAt < maxChars * 0.5) {
      // No good break at all — hard cut
      splitAt = maxChars;
    }

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  return chunks;
}

function findRelevantChunks(
  chunks: string[],
  topics: string[],
  maxChars: number
): string {
  if (chunks.length === 1) return chunks[0];

  // Score each chunk by how many topic keywords it contains
  const lowerTopics = topics.map((t) => t.toLowerCase());
  const scored = chunks.map((chunk, idx) => {
    const lowerChunk = chunk.toLowerCase();
    const score = lowerTopics.filter((t) =>
      t.split(/\s+/).some((word) => word.length > 3 && lowerChunk.includes(word))
    ).length;
    return { chunk, idx, score };
  });

  // Sort by relevance score descending
  scored.sort((a, b) => b.score - a.score);

  // Take chunks until we hit the max
  let combined = "";
  for (const { chunk } of scored) {
    if (combined.length + chunk.length > maxChars) break;
    combined += (combined ? "\n\n" : "") + chunk;
  }

  return combined || scored[0].chunk; // Fallback to highest-scored chunk
}

async function callClaude(
  system: string,
  userMessage: string,
  maxTokens: number
): Promise<string> {
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userMessage }],
  });

  const response = await stream.finalMessage();
  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  let text = content.text.trim();
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) text = match[1].trim();

  return text;
}

function unescapeJson(str: string): string {
  return str
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

// ── Main Generation Function ──

export async function generateCourseLectures(
  courseId: string,
  jobId: string
): Promise<void> {
  try {
    await db
      .update(generationJobs)
      .set({ status: "processing", startedAt: new Date() })
      .where(eq(generationJobs.id, jobId));

    async function updateProgress(message: string) {
      console.log(message);
      await db
        .update(generationJobs)
        .set({ error: message })
        .where(eq(generationJobs.id, jobId));
    }

    // ── Step 1: Extract text from uploads (with caching) ──
    await updateProgress("Extracting text from uploaded files...");

    const uploads = await db.query.courseUploads.findMany({
      where: (u, { eq: e }) => e(u.courseId, courseId),
      orderBy: (u) => asc(u.createdAt),
    });

    if (uploads.length === 0) {
      await db
        .update(generationJobs)
        .set({ status: "failed", error: "No source materials uploaded", completedAt: new Date() })
        .where(eq(generationJobs.id, jobId));
      return;
    }

    const textSections: string[] = [];
    for (let i = 0; i < uploads.length; i++) {
      const upload = uploads[i];

      if (upload.extractedText) {
        // Use cached text
        textSections.push(`--- Source: ${upload.fileName} ---\n\n${upload.extractedText}`);
      } else {
        // Extract and cache
        await updateProgress(`Extracting text from ${upload.fileName} (${i + 1}/${uploads.length})...`);
        const buffer = await getObjectBuffer(upload.r2Key);
        const text = await extractText(buffer, upload.fileType);
        textSections.push(`--- Source: ${upload.fileName} ---\n\n${text}`);

        // Cache the extracted text
        await db
          .update(courseUploads)
          .set({ extractedText: text })
          .where(eq(courseUploads.id, upload.id));
      }
    }

    const combinedText = textSections.join("\n\n");

    // ── Step 2: Chunk if needed + extract topics ──
    const chunks = chunkText(combinedText, MAX_CHUNK_CHARS);
    let outlineInput: string;

    if (chunks.length === 1) {
      // Small enough — send directly
      outlineInput = combinedText;
    } else {
      // Large content — extract topics from each chunk then merge
      await updateProgress(`Content split into ${chunks.length} chunks. Analyzing topics...`);

      const allTopics: TopicEntry[] = [];

      for (let i = 0; i < chunks.length; i++) {
        await updateProgress(`Analyzing chunk ${i + 1} of ${chunks.length}...`);

        const topicJson = await callClaude(
          TOPIC_EXTRACTION_PROMPT,
          `List all topics covered in this text:\n\n${chunks[i]}`,
          8192
        );

        try {
          const parsed: { topics: TopicEntry[] } = JSON.parse(topicJson);
          if (parsed.topics) allTopics.push(...parsed.topics);
        } catch {
          console.warn(`Failed to parse topics from chunk ${i + 1}`);
        }
      }

      // Deduplicate topics by name similarity
      const uniqueTopics: TopicEntry[] = [];
      for (const topic of allTopics) {
        const exists = uniqueTopics.some(
          (t) => t.name.toLowerCase() === topic.name.toLowerCase()
        );
        if (!exists) uniqueTopics.push(topic);
      }

      await updateProgress(`Found ${uniqueTopics.length} unique topics. Planning lecture structure...`);

      // Build a summary string for the outline prompt
      outlineInput = uniqueTopics
        .map((t) => `**${t.name}**: ${t.summary} (Key terms: ${t.keyTerms.join(", ")})`)
        .join("\n\n");
    }

    // ── Step 3: Pass 1 — Get lecture outline ──
    await updateProgress("Planning lecture structure...");

    const outlineJson = await callClaude(
      OUTLINE_PROMPT,
      `Analyze this content and determine the lecture structure:\n\n${outlineInput}`,
      4096
    );

    const outline: { lectures: LectureOutline[] } = JSON.parse(outlineJson);
    if (!outline.lectures?.length) throw new Error("AI returned no lecture outline");

    await updateProgress(`Planned ${outline.lectures.length} lectures. Starting content generation...`);

    // ── Step 4: Pass 2 — Generate each lecture ──
    const defaultModuleId = await getOrCreateDefaultModule(courseId);

    // Delete existing lectures in default module
    await db.delete(lectures).where(eq(lectures.moduleId, defaultModuleId));

    let lecturesCreated = 0;

    for (let i = 0; i < outline.lectures.length; i++) {
      const lec = outline.lectures[i];
      await updateProgress(`Generating lecture ${i + 1} of ${outline.lectures.length}: ${lec.title}`);

      try {
        // Find relevant content for this lecture's topics
        const relevantText = findRelevantChunks(chunks, lec.topicsCovered, MAX_CHUNK_CHARS);

        const lectureJson = await callClaude(
          LECTURE_PROMPT,
          `Generate comprehensive lesson content for this lecture:

**Lecture Title:** ${lec.title}
**Description:** ${lec.description}
**Topics to Cover:** ${lec.topicsCovered.join(", ")}

Use the following source materials as the basis for your content. Extract and expand on all relevant information:\n\n${relevantText}`,
          64000
        );

        let lectureContent: LectureContent;
        try {
          lectureContent = JSON.parse(lectureJson);
        } catch {
          // Salvage partial content from truncated JSON
          const kcMatch = lectureJson.match(/"keyConcepts"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"areasOfConcentration|"?\s*}?\s*$)/);
          const aocMatch = lectureJson.match(/"areasOfConcentration"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"examQuestions|"?\s*}?\s*$)/);
          const eqMatch = lectureJson.match(/"examQuestions"\s*:\s*"([\s\S]*?)(?:"\s*}?\s*$)/);

          lectureContent = {
            keyConcepts: kcMatch ? unescapeJson(kcMatch[1]) : "",
            areasOfConcentration: aocMatch ? unescapeJson(aocMatch[1]) : "",
            examQuestions: eqMatch ? unescapeJson(eqMatch[1]) : "",
          };

          if (!lectureContent.keyConcepts) {
            console.warn(`Skipping lecture "${lec.title}" — could not parse content`);
            continue;
          }
        }

        const [createdLecture] = await db
          .insert(lectures)
          .values({
            moduleId: defaultModuleId,
            title: lec.title,
            description: lec.description || null,
            orderIndex: i,
            aiStatus: "done",
          })
          .returning();

        await db.insert(studyAids).values({
          lectureId: createdLecture.id,
          keyConcepts: lectureContent.keyConcepts,
          areasOfConcentration: lectureContent.areasOfConcentration,
          examQuestions: lectureContent.examQuestions,
        });

        lecturesCreated++;
        await updateProgress(`Completed ${lecturesCreated} of ${outline.lectures.length} lectures`);
      } catch (err) {
        console.error(`Failed to generate lecture "${lec.title}":`, err);
      }
    }

    if (lecturesCreated === 0) {
      throw new Error("Failed to generate any lectures");
    }

    await db
      .update(generationJobs)
      .set({
        status: "done",
        error: null,
        lecturesCreated,
        completedAt: new Date(),
      })
      .where(eq(generationJobs.id, jobId));

    console.log(`Generation complete: ${lecturesCreated} lectures created`);
  } catch (error) {
    console.error("Course lecture generation failed:", error);
    await db
      .update(generationJobs)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      })
      .where(eq(generationJobs.id, jobId));
  }
}
