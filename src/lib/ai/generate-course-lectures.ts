import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db/drizzle";
import {
  courses,
  courseUploads,
  generationJobs,
  lectures,
  studyAids,
  users,
} from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getObjectBuffer } from "@/lib/r2/client";
import { extractText } from "./extract-text";
import { getOrCreateDefaultModule } from "@/lib/db/default-module";
import { parseSlides, parseQuestions } from "@/lib/study-aid-parser";

const anthropic = new Anthropic();

const MAX_CHUNK_CHARS = 450000; // ~112K tokens — leaves room for prompts
const MODEL = "claude-sonnet-4-20250514";

// ── Prompts ──

const COMPREHENSION_PROMPT = `You are a world-class academic analyst. Your job is to deeply understand the provided course materials and extract a structured analysis that will guide lecture generation.

Do NOT generate any teaching content yet. Your goal is ANALYSIS ONLY.

Return ONLY valid JSON (no markdown wrapping):
{
  "courseSubject": "The academic field/domain (e.g., 'Quantitative Methods for Business', 'Corporate Finance')",
  "coreThemes": ["The 3-5 overarching themes that tie the material together"],
  "topics": [
    {
      "name": "Topic name",
      "importance": "high|medium|low",
      "prerequisites": ["Names of other topics that should be taught first"],
      "keyInsights": ["The non-obvious things a student MUST understand — not just definitions, but the deeper 'aha' moments"],
      "commonMisconceptions": ["What students typically get wrong about this topic and why"],
      "sourceDepth": "How much detail the source material provides (deep|moderate|shallow)"
    }
  ],
  "pedagogicalNotes": "Your expert assessment: What is the best order to teach these topics? What are the natural groupings? Where do students typically struggle? What connections between topics are not obvious but important?"
}

Be exhaustive in your topic extraction. Identify EVERY distinct concept, framework, model, and skill covered in the materials.`;

const CURRICULUM_PROMPT = `You are designing a university course curriculum for university students. You have already analyzed the source materials and produced a comprehension analysis.

Your job is to organize the topics into 3-6 lectures that build understanding PROGRESSIVELY. Each lecture must tell a coherent story — not just group related topics.

Return ONLY valid JSON (no markdown wrapping):
{
  "lectures": [
    {
      "title": "A clear, specific lecture title (not generic like 'Introduction')",
      "description": "What this lecture teaches and WHY it matters — write this as if pitching the lecture to a student who is deciding whether to attend",
      "narrativeArc": "The story of this lecture: what question does it open with? How does it build? What insight does it culminate in?",
      "topicsCovered": ["topic1", "topic2"],
      "openingHook": "The first thing students see — a compelling question, scenario, or surprising fact that makes them want to learn more",
      "keyTakeaways": ["The 3-5 things that should stick after studying this lecture"]
    }
  ]
}

Guidelines:
- Create 3-6 lectures. Fewer = more depth per lecture. Quality over quantity.
- Each lecture should have a NARRATIVE ARC — it tells a story, not just lists information.
- Sequence lectures so that each one builds on the previous. Prerequisites first.
- Consolidate overlapping content from different sources.
- The opening hook should make a student think "I need to understand this."`;

const CONTENT_PROMPT = `You are the world's best professor writing lecture notes for university students. Your students are smart but have ZERO prior knowledge of this specific topic. They should be able to study ONLY your notes and pass the university exam with flying colors.

Your goal is GENUINE UNDERSTANDING — not information transfer. A student reading your notes should feel like they're sitting in a brilliant lecture, not reading a textbook.

WRITING APPROACH:
- Start every concept with WHY it matters — give students a reason to care before diving into what it is
- Explain the INTUITION before the formal definition. Help students build mental models.
- Use concrete, specific examples. Name real companies, real scenarios, real numbers. "Consider a company..." is weak; "When Netflix decided to split its streaming and DVD businesses in 2011..." is strong.
- When introducing formulas or frameworks, walk through the logic step by step. Don't just state the formula — show WHY each piece is there.
- Anticipate confusion. Where will students get stuck? Address it proactively.
- Connect concepts to each other. Show how this concept relates to what came before and what comes next.

Return ONLY markdown content. Do NOT wrap in JSON or code fences.

FORMATTING RULES:
- Your VERY FIRST LINE must be a concept title in bold: **Concept Title**
- Structure content as 8-12 concept sections, each starting with **Concept Title** on its own line
- Use ### for sub-headings within a concept (Core Explanation, How It Works, Real-World Application, etc.)
- Use bullet points, numbered lists, and markdown tables for visual hierarchy
- Use plain text for math: NPV = CF1/(1+r) + CF2/(1+r)^2 + ... Do NOT use LaTeX ($, $$, \\frac, \\sum, etc.)
- Use bold for key terms on first introduction
- Use markdown tables for comparisons (| Header | Header |)
- Each concept must have substantial content — multiple paragraphs with sub-sections, NOT a single paragraph`;

const AREAS_PROMPT = `You are an expert exam coach preparing university students for their university exams. You have the full lesson notes for this lecture.

Your job is to tell students exactly what to focus on, what examiners look for, and how to structure strong answers. Be SPECIFIC and ACTIONABLE — generic advice like "understand the key concepts" is worthless.

Return ONLY markdown content. Do NOT wrap in JSON or code fences.

FORMATTING RULES:
- Your VERY FIRST LINE must be an area title in bold: **Area Title**
- Write 5-7 exam focus areas, each starting with **Area Title** on its own line
- Use ### for sub-headings within each area
- Do NOT use LaTeX ($, $$, \\frac, etc.). Use plain text for any math.

For each focus area, cover:

### What Examiners Test
Specific aspects examiners focus on — name the exact type of question they'd ask.

### Common Mistakes to Avoid
- Concrete mistakes with explanations of why they cost marks

### How to Structure a Strong Answer
Step-by-step structure for answering exam questions on this topic.

### Key Terms and Frameworks
Specific terms, models, and frameworks that MUST appear in a strong answer.`;

const QUESTIONS_PROMPT = `You are a tough but fair university professor creating practice exam questions for university students. You have the full lesson notes and exam focus areas.

Every question must test UNDERSTANDING and APPLICATION — not recall. If a student could answer the question by memorizing a definition without understanding it, the question is too easy.

Return ONLY markdown content. Do NOT wrap in JSON or code fences.

FORMATTING RULES:
- Do NOT use LaTeX ($, $$, \\frac, etc.). Use plain text for any math.

### Multiple Choice Questions
Generate exactly 10 scenario-based MCQ questions. Each question must present a realistic situation.
**Q1.** [Scenario that requires applying a concept to answer]
- A) [Plausible option — a common misconception should be one of the wrong answers]
- B) [Plausible option]
- C) [Plausible option]
- D) [Plausible option]

**Answer:** [Letter] — [Explain why this is correct AND why each wrong answer is wrong. 2-3 sentences minimum.]

### Short Answer Questions
Generate exactly 5 questions requiring concept APPLICATION (not just definition).

**Q1.** [Question that requires applying knowledge to a specific scenario]
**Answer:** [Detailed model answer, 3-5 sentences with specific examples]

### Case Analysis Questions
Generate exactly 2 realistic case scenarios. Each case should be 3-4 paragraphs describing a real-world business situation, followed by analytical questions.

**Q1.** [Detailed case scenario with specific numbers, company details, and market context]
**Answer:** [Comprehensive analysis applying multiple concepts from the lecture, 4-6 paragraphs]

### Essay Questions
Generate exactly 2 essay questions that mirror actual university exam questions.

**Q1.** [Thought-provoking essay question that requires synthesizing multiple concepts]
**Answer:** [Structured model essay with introduction, key arguments with evidence, and conclusion — 5-8 paragraphs]`;

const REVIEW_PROMPT = `You are a demanding university student who has paid a lot of money for this course. You are reviewing the study materials for a single lecture. Be critical but constructive.

For each concept section in the lesson notes, evaluate:
1. **Clarity (1-5):** Could a beginner with zero background actually understand this? Or does it assume prior knowledge?
2. **Examples (1-5):** Are there concrete, specific examples? Or is it all abstract theory?
3. **Depth (1-5):** Does it explain the WHY, or just state facts? Does it build intuition?
4. **Usefulness (1-5):** Would studying this help pass an exam? Or is it padding?

Return ONLY valid JSON (no markdown wrapping):
{
  "overallScore": 1-5,
  "sections": [
    {
      "title": "Section title as it appears in the notes",
      "clarity": 1-5,
      "examples": 1-5,
      "depth": 1-5,
      "usefulness": 1-5,
      "feedback": "Specific, actionable feedback — what exactly is wrong and how to fix it"
    }
  ],
  "weakestSections": ["Titles of sections scoring below 3 on any dimension"],
  "overallFeedback": "Summary of the biggest issues across all sections"
}`;

// ── Types ──

interface LectureOutline {
  title: string;
  description: string;
  narrativeArc?: string;
  topicsCovered: string[];
  openingHook?: string;
  keyTakeaways?: string[];
}

interface ComprehensionAnalysis {
  courseSubject: string;
  coreThemes: string[];
  topics: {
    name: string;
    importance: string;
    prerequisites: string[];
    keyInsights: string[];
    commonMisconceptions: string[];
    sourceDepth: string;
  }[];
  pedagogicalNotes: string;
}

interface ReviewResult {
  overallScore: number;
  sections: {
    title: string;
    clarity: number;
    examples: number;
    depth: number;
    usefulness: number;
    feedback: string;
  }[];
  weakestSections: string[];
  overallFeedback: string;
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

    let splitAt = remaining.lastIndexOf("\n\n", maxChars);
    if (splitAt < maxChars * 0.5) {
      splitAt = remaining.lastIndexOf("\n", maxChars);
    }
    if (splitAt < maxChars * 0.5) {
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

  const lowerTopics = topics.map((t) => t.toLowerCase().trim());
  const scored = chunks.map((chunk, idx) => {
    const lowerChunk = chunk.toLowerCase();
    let score = 0;
    for (const topic of lowerTopics) {
      if (lowerChunk.includes(topic)) {
        score += 3;
        continue;
      }
      const words = topic.split(/\s+/).filter((w) => w.length >= 2);
      const wordMatches = words.filter((w) => lowerChunk.includes(w)).length;
      if (wordMatches > 0) score += wordMatches;
    }
    return { chunk, idx, score };
  });

  scored.sort((a, b) => b.score - a.score);

  let combined = "";
  for (const { chunk } of scored) {
    if (combined.length + chunk.length > maxChars) break;
    combined += (combined ? "\n\n" : "") + chunk;
  }

  return combined || scored[0].chunk;
}

interface ClaudeResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

async function callClaude(opts: {
  system: string;
  userMessage: string;
  maxTokens: number;
  thinking?: boolean;
  thinkingBudget?: number;
}): Promise<ClaudeResult> {
  const { system, userMessage, maxTokens, thinking, thinkingBudget } = opts;

  if (thinking) {
    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: maxTokens + (thinkingBudget || 10000),
      thinking: { type: "enabled", budget_tokens: thinkingBudget || 10000 },
      system,
      messages: [{ role: "user", content: userMessage }],
    });

    const response = await stream.finalMessage();
    const usage = response.usage;

    for (const block of response.content) {
      if (block.type === "text") {
        let text = block.text.trim();
        const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match) text = match[1].trim();
        return { text, inputTokens: usage?.input_tokens || 0, outputTokens: usage?.output_tokens || 0 };
      }
    }
    throw new Error("No text block in thinking response");
  }

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userMessage }],
  });

  const response = await stream.finalMessage();
  const usage = response.usage;
  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  let text = content.text.trim();
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) text = match[1].trim();

  return { text, inputTokens: usage?.input_tokens || 0, outputTokens: usage?.output_tokens || 0 };
}

function parseContentResponse(raw: string): string {
  if (raw.startsWith("{") || raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      return parsed.content || "";
    } catch {
      const start = raw.indexOf('"content"');
      if (start !== -1) {
        const valueStart = raw.indexOf('"', raw.indexOf(":", start) + 1) + 1;
        const valueEnd = raw.lastIndexOf('"');
        if (valueStart > 0 && valueEnd > valueStart) {
          try {
            return JSON.parse(`"${raw.slice(valueStart, valueEnd)}"`);
          } catch {
            return raw.slice(valueStart, valueEnd)
              .replace(/\\n/g, "\n")
              .replace(/\\t/g, "\t")
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, "\\");
          }
        }
      }
    }
  }
  return raw;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
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

    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    async function trackedCallClaude(opts: Parameters<typeof callClaude>[0]): Promise<string> {
      const result = await callClaude(opts);
      totalInputTokens += result.inputTokens;
      totalOutputTokens += result.outputTokens;
      return result.text;
    }

    // ── Load student profile for tailored generation ──
    const course = await db.query.courses.findFirst({
      where: (c, { eq: e }) => e(c.id, courseId),
    });
    let studentContext = "";
    if (course?.createdBy) {
      const creator = await db.query.users.findFirst({
        where: (u, { eq: e }) => e(u.id, course.createdBy),
        columns: { educationLevel: true, fieldOfStudy: true, learningGoal: true },
      });
      if (creator?.educationLevel) {
        const levelLabel: Record<string, string> = {
          high_school: "high school",
          undergraduate: "undergraduate",
          postgraduate: "postgraduate",
          professional: "professional",
        };
        const goalLabel: Record<string, string> = {
          exam_prep: "exam preparation",
          deep_understanding: "deep conceptual understanding",
          quick_review: "quick review of key concepts",
        };
        const parts = [`The student is at the ${levelLabel[creator.educationLevel] || creator.educationLevel} level`];
        if (creator.fieldOfStudy) parts.push(`studying ${creator.fieldOfStudy}`);
        if (creator.learningGoal) parts.push(`with a focus on ${goalLabel[creator.learningGoal] || creator.learningGoal}`);
        studentContext = parts.join(", ") + ". Tailor the depth, examples, and language to this level.";
      }
    }

    // Append student context to generation prompts
    const ctxSuffix = studentContext ? `\n\nSTUDENT PROFILE: ${studentContext}` : "";

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
        textSections.push(`--- Source: ${upload.fileName} ---\n\n${upload.extractedText}`);
      } else {
        await updateProgress(`Extracting text from ${upload.fileName} (${i + 1}/${uploads.length})...`);
        const buffer = await getObjectBuffer(upload.r2Key);
        const text = await extractText(buffer, upload.fileType);
        textSections.push(`--- Source: ${upload.fileName} ---\n\n${text}`);

        await db
          .update(courseUploads)
          .set({ extractedText: text })
          .where(eq(courseUploads.id, upload.id));
      }
    }

    const combinedText = textSections.join("\n\n");
    const chunks = chunkText(combinedText, MAX_CHUNK_CHARS);

    // ── Agent Step 1: Deep Comprehension ──
    await updateProgress("Analyzing source materials deeply...");

    let comprehension: ComprehensionAnalysis;

    if (chunks.length === 1) {
      // All content fits — analyze in one pass with extended thinking
      const analysisJson = await trackedCallClaude({
        system: COMPREHENSION_PROMPT + ctxSuffix,
        userMessage: `Analyze this course material thoroughly:\n\n${combinedText}`,
        maxTokens: 8192,
        thinking: true,
        thinkingBudget: 10000,
      });

      try {
        comprehension = JSON.parse(analysisJson);
      } catch {
        console.warn("Comprehension parse failed, using fallback");
        comprehension = {
          courseSubject: "Course Materials",
          coreThemes: [],
          topics: [],
          pedagogicalNotes: "",
        };
      }
    } else {
      // Chunked content — analyze each chunk then merge
      await updateProgress(`Content split into ${chunks.length} parts. Analyzing each...`);

      const chunkAnalyses: ComprehensionAnalysis[] = [];

      // Analyze chunks in parallel (batches of 3)
      for (let i = 0; i < chunks.length; i += 3) {
        const batch = chunks.slice(i, i + 3);
        await updateProgress(`Analyzing parts ${i + 1}-${Math.min(i + batch.length, chunks.length)} of ${chunks.length}...`);

        const results = await Promise.allSettled(
          batch.map((chunk) =>
            trackedCallClaude({
              system: COMPREHENSION_PROMPT + ctxSuffix,
              userMessage: `Analyze this course material thoroughly:\n\n${chunk}`,
              maxTokens: 8192,
              thinking: true,
              thinkingBudget: 8000,
            })
          )
        );

        for (let j = 0; j < results.length; j++) {
          const result = results[j];
          if (result.status === "fulfilled") {
            try {
              chunkAnalyses.push(JSON.parse(result.value));
            } catch {
              console.warn(`Failed to parse analysis from chunk ${i + j + 1}`);
            }
          } else {
            console.warn(`Chunk ${i + j + 1} analysis failed:`, result.reason);
          }
        }
      }

      // Merge chunk analyses
      const allTopics = chunkAnalyses.flatMap((a) => a.topics || []);

      // Deduplicate topics by name similarity
      function normalizeName(name: string): string {
        return name.toLowerCase().trim()
          .replace(/[''"""]/g, "")
          .replace(/\s+/g, " ");
      }

      const uniqueTopics = allTopics.filter((topic, idx) => {
        const norm = normalizeName(topic.name);
        return !allTopics.slice(0, idx).some((t) => {
          const tNorm = normalizeName(t.name);
          return tNorm === norm || tNorm.includes(norm) || norm.includes(tNorm);
        });
      });

      comprehension = {
        courseSubject: chunkAnalyses[0]?.courseSubject || "Course Materials",
        coreThemes: [...new Set(chunkAnalyses.flatMap((a) => a.coreThemes || []))],
        topics: uniqueTopics,
        pedagogicalNotes: chunkAnalyses.map((a) => a.pedagogicalNotes).filter(Boolean).join("\n\n"),
      };
    }

    await updateProgress(`Identified ${comprehension.topics.length} topics in ${comprehension.courseSubject}. Planning curriculum...`);

    // ── Agent Step 2: Curriculum Planning ──
    await updateProgress("Designing curriculum structure...");

    const comprehensionSummary = JSON.stringify(comprehension, null, 2);

    const curriculumJson = await trackedCallClaude({
      system: CURRICULUM_PROMPT + ctxSuffix,
      userMessage: `Here is the deep analysis of the course materials:\n\n${comprehensionSummary}\n\nDesign the optimal lecture sequence.`,
      maxTokens: 4096,
      thinking: true,
      thinkingBudget: 8000,
    });

    let outline: { lectures: LectureOutline[] };
    try {
      outline = JSON.parse(curriculumJson);
    } catch {
      console.warn("Curriculum JSON parse failed, retrying...");
      const retryJson = await trackedCallClaude({
        system: CURRICULUM_PROMPT + ctxSuffix,
        userMessage: `IMPORTANT: Return ONLY valid JSON.\n\nHere is the analysis:\n\n${comprehensionSummary}\n\nDesign the lecture sequence.`,
        maxTokens: 4096,
        thinking: true,
        thinkingBudget: 4000,
      });
      try {
        outline = JSON.parse(retryJson);
      } catch {
        outline = {
          lectures: [{
            title: comprehension.courseSubject || "Course Overview",
            description: "Comprehensive overview of all course materials",
            topicsCovered: comprehension.topics.map((t) => t.name),
          }],
        };
      }
    }
    if (!outline.lectures?.length) throw new Error("AI returned no lecture outline");

    await updateProgress(`Planned ${outline.lectures.length} lectures. Generating content...`);

    // ── Agent Steps 3-5: Generate each lecture ──
    const defaultModuleId = await getOrCreateDefaultModule(courseId);

    // Load old lectures + study aids to preserve manual edits
    const oldLectures = await db.query.lectures.findMany({
      where: (l, { eq: e }) => e(l.moduleId, defaultModuleId),
      with: { studyAid: true },
    });
    const oldLectureMap = new Map(
      oldLectures.map((l) => [l.title.toLowerCase().trim(), l])
    );

    let lecturesCreated = 0;
    let manualEditsPreserved = 0;
    const createdLectureIds: { lectureId: string; outline: LectureOutline }[] = [];
    const total = outline.lectures.length;

    async function generateOneLecture(lec: LectureOutline, index: number) {
      const relevantText = findRelevantChunks(chunks, lec.topicsCovered, MAX_CHUNK_CHARS);
      const shortRelevantText = findRelevantChunks(chunks, lec.topicsCovered, Math.floor(MAX_CHUNK_CHARS / 2));

      // Find relevant topic analysis from comprehension
      const relevantTopics = comprehension.topics.filter((t) =>
        lec.topicsCovered.some((covered) =>
          covered.toLowerCase().includes(t.name.toLowerCase()) ||
          t.name.toLowerCase().includes(covered.toLowerCase())
        )
      );

      const topicContext = relevantTopics.length > 0
        ? `\n\n--- TOPIC ANALYSIS (from deep reading of source materials) ---\n${relevantTopics.map((t) =>
          `**${t.name}** (${t.importance} importance)\n- Key insights: ${t.keyInsights.join("; ")}\n- Common misconceptions: ${t.commonMisconceptions.join("; ")}\n- Source depth: ${t.sourceDepth}`
        ).join("\n\n")}`
        : "";

      // ── Step 3: Content Writing with Extended Thinking ──
      await updateProgress(`Writing lecture ${index + 1} of ${total}: ${lec.title}...`);

      const lectureContext = `**Lecture Title:** ${lec.title}
**Description:** ${lec.description}
${lec.narrativeArc ? `**Narrative Arc:** ${lec.narrativeArc}` : ""}
${lec.openingHook ? `**Opening Hook (use this to inspire your first concept):** ${lec.openingHook}` : ""}
**Topics to Cover:** ${lec.topicsCovered.join(", ")}
${lec.keyTakeaways ? `**Key Takeaways Students Must Leave With:** ${lec.keyTakeaways.join("; ")}` : ""}
${topicContext}

--- SOURCE MATERIALS ---

Use these as the factual basis for your content. Extract, expand, and explain all relevant information:

${relevantText}`;

      const keyConcepts = parseContentResponse(
        await trackedCallClaude({
          system: CONTENT_PROMPT + ctxSuffix,
          userMessage: lectureContext,
          maxTokens: 32000,
          thinking: true,
          thinkingBudget: 16000,
        })
      );

      if (!keyConcepts) {
        console.warn(`Skipping lecture "${lec.title}" — content generation returned empty`);
        return;
      }

      // ── Steps 4: Areas + Questions in parallel (with extended thinking) ──
      await updateProgress(`Creating exam prep & questions for lecture ${index + 1}: ${lec.title}...`);

      const followUpContext = `**Lecture Title:** ${lec.title}
**Description:** ${lec.description}
**Topics Covered:** ${lec.topicsCovered.join(", ")}

--- SOURCE MATERIALS ---

${shortRelevantText}

--- LESSON NOTES FOR THIS LECTURE ---

${keyConcepts}`;

      const [areasOfConcentration, examQuestions] = await Promise.all([
        trackedCallClaude({
          system: AREAS_PROMPT + ctxSuffix,
          userMessage: followUpContext,
          maxTokens: 16000,
          thinking: true,
          thinkingBudget: 6000,
        }).then(parseContentResponse),
        trackedCallClaude({
          system: QUESTIONS_PROMPT + ctxSuffix,
          userMessage: followUpContext,
          maxTokens: 16000,
          thinking: true,
          thinkingBudget: 8000,
        }).then(parseContentResponse),
      ]);

      // ── Step 5: Quality Review ──
      await updateProgress(`Reviewing quality of lecture ${index + 1}: ${lec.title}...`);

      let finalKeyConcepts = keyConcepts;
      let finalAreas = areasOfConcentration;
      let finalQuestions = examQuestions;

      try {
        const reviewJson = await trackedCallClaude({
          system: REVIEW_PROMPT + ctxSuffix,
          userMessage: `Review these study materials for the lecture "${lec.title}":\n\n--- KEY CONCEPTS ---\n${keyConcepts}\n\n--- EXAM FOCUS AREAS ---\n${areasOfConcentration}`,
          maxTokens: 4096,
          thinking: true,
          thinkingBudget: 10000,
        });

        let review: ReviewResult;
        try {
          review = JSON.parse(reviewJson);
        } catch {
          review = { overallScore: 3, sections: [], weakestSections: [], overallFeedback: "" };
        }

        // Regenerate weak sections if overall quality is poor
        if (review.overallScore < 3 || review.weakestSections.length > 2) {
          await updateProgress(`Improving weak sections in lecture ${index + 1}: ${lec.title}...`);

          const weakFeedback = review.sections
            .filter((s) => Math.min(s.clarity, s.examples, s.depth, s.usefulness) < 3)
            .map((s) => `"${s.title}": ${s.feedback}`)
            .join("\n");

          const improvementContext = `${lectureContext}

--- QUALITY REVIEW FEEDBACK ---
The following sections need improvement:
${weakFeedback || review.overallFeedback}

Rewrite ALL concept sections, paying special attention to the weak areas identified above. Make sure every concept has concrete examples, explains the WHY, and would be understandable to a beginner.`;

          const improved = parseContentResponse(
            await trackedCallClaude({
              system: CONTENT_PROMPT + ctxSuffix,
              userMessage: improvementContext,
              maxTokens: 32000,
              thinking: true,
              thinkingBudget: 12000,
            })
          );

          if (improved && improved.length > keyConcepts.length * 0.5) {
            finalKeyConcepts = improved;

            // Regenerate areas and questions based on improved content
            const improvedFollowUp = `**Lecture Title:** ${lec.title}
**Description:** ${lec.description}
**Topics Covered:** ${lec.topicsCovered.join(", ")}

--- SOURCE MATERIALS ---

${shortRelevantText}

--- LESSON NOTES FOR THIS LECTURE ---

${improved}`;

            const [improvedAreas, improvedQuestions] = await Promise.all([
              trackedCallClaude({
                system: AREAS_PROMPT + ctxSuffix,
                userMessage: improvedFollowUp,
                maxTokens: 16000,
                thinking: true,
                thinkingBudget: 4000,
              }).then(parseContentResponse),
              trackedCallClaude({
                system: QUESTIONS_PROMPT + ctxSuffix,
                userMessage: improvedFollowUp,
                maxTokens: 16000,
                thinking: true,
                thinkingBudget: 4000,
              }).then(parseContentResponse),
            ]);

            if (improvedAreas) finalAreas = improvedAreas;
            if (improvedQuestions) finalQuestions = improvedQuestions;
          }
        }
      } catch (err) {
        console.warn(`Quality review failed for "${lec.title}", using initial content:`, err);
      }

      // Also run structural validation (catches parsing issues)
      // Check concepts first — if they need regen, it cascades to areas+questions
      const conceptSlides = parseSlides(finalKeyConcepts, null).filter((s) => s.section === "concept");

      if (conceptSlides.length < 4 || median(conceptSlides.map((s) => s.body.trim().length)) < 200) {
        console.log(`Structural issues in concepts for "${lec.title}" (${conceptSlides.length} slides), regenerating...`);
        try {
          const regenConcepts = parseContentResponse(
            await trackedCallClaude({
              system: CONTENT_PROMPT + ctxSuffix,
              userMessage: lectureContext,
              maxTokens: 32000,
              thinking: true,
              thinkingBudget: 12000,
            })
          );
          if (regenConcepts && parseSlides(regenConcepts, null).length >= 4) {
            finalKeyConcepts = regenConcepts;

            // Cascade: regenerate areas and questions to match new content
            const cascadeContext = `**Lecture Title:** ${lec.title}
**Description:** ${lec.description}
**Topics Covered:** ${lec.topicsCovered.join(", ")}

--- SOURCE MATERIALS ---

${shortRelevantText}

--- LESSON NOTES FOR THIS LECTURE ---

${regenConcepts}`;

            const [cascadeAreas, cascadeQuestions] = await Promise.all([
              trackedCallClaude({
                system: AREAS_PROMPT + ctxSuffix,
                userMessage: cascadeContext,
                maxTokens: 16000,
                thinking: true,
                thinkingBudget: 4000,
              }).then(parseContentResponse),
              trackedCallClaude({
                system: QUESTIONS_PROMPT + ctxSuffix,
                userMessage: cascadeContext,
                maxTokens: 16000,
                thinking: true,
                thinkingBudget: 4000,
              }).then(parseContentResponse),
            ]);

            if (cascadeAreas) finalAreas = cascadeAreas;
            if (cascadeQuestions) finalQuestions = cascadeQuestions;
          }
        } catch (err) {
          console.warn(`Concept regeneration failed for "${lec.title}":`, err);
        }
      }

      // Check questions (re-parse since cascade may have updated finalQuestions)
      const parsedQuestions = parseQuestions(finalQuestions);
      const mcqs = parsedQuestions.filter((q) => q.type === "mcq");
      const mcqsMissingAnswer = mcqs.filter((q) => !q.correctAnswer).length;

      if (parsedQuestions.length < 10 || mcqs.length < 5 || mcqsMissingAnswer > 0) {
        console.log(`Structural issues in questions for "${lec.title}", regenerating...`);
        try {
          const freshContext = `**Lecture Title:** ${lec.title}
**Description:** ${lec.description}
**Topics Covered:** ${lec.topicsCovered.join(", ")}

--- SOURCE MATERIALS ---

${shortRelevantText}

--- LESSON NOTES FOR THIS LECTURE ---

${finalKeyConcepts}`;

          const regenQuestions = parseContentResponse(
            await trackedCallClaude({
              system: QUESTIONS_PROMPT + ctxSuffix,
              userMessage: freshContext,
              maxTokens: 16000,
              thinking: true,
              thinkingBudget: 6000,
            })
          );
          if (regenQuestions) finalQuestions = regenQuestions;
        } catch (err) {
          console.warn(`Question regeneration failed for "${lec.title}":`, err);
        }
      }

      // ── Save to DB ──
      const [createdLecture] = await db
        .insert(lectures)
        .values({
          moduleId: defaultModuleId,
          title: lec.title,
          description: lec.description || null,
          orderIndex: index,
          aiStatus: "done",
        })
        .returning();

      // Check if old lecture had manual edits — preserve them
      const oldMatch = oldLectureMap.get(lec.title.toLowerCase().trim());
      const oldStudyAid = oldMatch?.studyAid;
      const hasManualEdits = oldStudyAid?.manuallyEdited;

      if (hasManualEdits) {
        await db.insert(studyAids).values({
          lectureId: createdLecture.id,
          keyConcepts: oldStudyAid.keyConcepts,
          areasOfConcentration: oldStudyAid.areasOfConcentration,
          examQuestions: oldStudyAid.examQuestions,
          manuallyEdited: true,
        });
        manualEditsPreserved++;
        console.log(`Preserved manual edits for "${lec.title}"`);
      } else {
        await db.insert(studyAids).values({
          lectureId: createdLecture.id,
          keyConcepts: finalKeyConcepts,
          areasOfConcentration: finalAreas,
          examQuestions: finalQuestions,
        });
      }

      createdLectureIds.push({ lectureId: createdLecture.id, outline: lec });
      lecturesCreated++;
      await updateProgress(`Completed lecture ${lecturesCreated} of ${total}: ${lec.title}`);
    }

    // Process lectures in batches of 4 for parallelism
    for (let i = 0; i < outline.lectures.length; i += 4) {
      const batch = outline.lectures.slice(i, i + 4);
      const results = await Promise.allSettled(
        batch.map((lec, j) => generateOneLecture(lec, i + j))
      );
      for (const result of results) {
        if (result.status === "rejected") {
          console.error("Lecture generation failed:", result.reason);
        }
      }
    }

    if (lecturesCreated === 0) {
      throw new Error("Failed to generate any lectures");
    }

    // Delete old lectures now that new ones are confirmed
    const newLectureIds = new Set(createdLectureIds.map((l) => l.lectureId));
    const existingLectures = await db.query.lectures.findMany({
      where: (l, { eq: e }) => e(l.moduleId, defaultModuleId),
      columns: { id: true },
    });
    for (const existing of existingLectures) {
      if (!newLectureIds.has(existing.id)) {
        await db.delete(lectures).where(eq(lectures.id, existing.id));
      }
    }

    await db
      .update(generationJobs)
      .set({
        status: "done",
        error: null,
        lecturesCreated,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        completedAt: new Date(),
      })
      .where(eq(generationJobs.id, jobId));

    // Auto-publish the course now that lectures are ready
    await db
      .update(courses)
      .set({ status: "published", updatedAt: new Date() })
      .where(eq(courses.id, courseId));

    console.log(`Generation complete: ${lecturesCreated} lectures created, ${manualEditsPreserved} manual edits preserved`);
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
