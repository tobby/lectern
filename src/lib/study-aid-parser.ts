export interface Slide {
  id: number;
  section: "concept" | "area";
  title: string;
  body: string;
}

export interface Question {
  id: number;
  type: "mcq" | "short_answer" | "case_analysis" | "essay";
  sectionLabel: string;
  question: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  modelAnswer?: string;
}

export function parseSlides(
  keyConcepts: string | null,
  areasOfConcentration: string | null
): Slide[] {
  const slides: Slide[] = [];
  let id = 0;

  if (keyConcepts) {
    const conceptSlides = parseSectionIntoSlides(keyConcepts, "concept");
    for (const s of conceptSlides) {
      slides.push({ ...s, id: id++ });
    }
  }

  if (areasOfConcentration) {
    const areaSlides = parseSectionIntoSlides(areasOfConcentration, "area");
    for (const s of areaSlides) {
      slides.push({ ...s, id: id++ });
    }
  }

  // Fallback: if nothing parsed, create one slide per section
  if (slides.length === 0) {
    if (keyConcepts) {
      slides.push({ id: 0, section: "concept", title: "Key Concepts", body: keyConcepts });
    }
    if (areasOfConcentration) {
      slides.push({
        id: slides.length,
        section: "area",
        title: "Areas of Concentration",
        body: areasOfConcentration,
      });
    }
  }

  return slides;
}

function parseSectionIntoSlides(
  markdown: string,
  section: "concept" | "area"
): Omit<Slide, "id">[] {
  const slides: Omit<Slide, "id">[] = [];

  // Split into paragraphs
  const blocks = markdown.split(/\n\n+/);
  let current: { title: string; body: string[] } | null = null;

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Check if block starts with a bold heading: **Title** (with optional colon, space, or newline after)
    const boldMatch = trimmed.match(/^\*\*(.+?)\*\*[\s:.]*([\s\S]*)/);
    // Or a numbered bold heading: **1. Title** or **Q1.** etc
    const numberedMatch = trimmed.match(/^\*\*\d+[\.\)]\s*(.+?)\*\*[\s:.]*([\s\S]*)/);
    // Or a markdown heading
    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)/);

    if (numberedMatch) {
      if (current) slides.push({ section, title: current.title, body: current.body.join("\n\n") });
      current = { title: numberedMatch[1].trim(), body: numberedMatch[2]?.trim() ? [numberedMatch[2].trim()] : [] };
    } else if (boldMatch && !trimmed.startsWith("**Answer")) {
      if (current) slides.push({ section, title: current.title, body: current.body.join("\n\n") });
      current = { title: boldMatch[1].trim(), body: boldMatch[2]?.trim() ? [boldMatch[2].trim()] : [] };
    } else if (headingMatch) {
      const isH2 = trimmed.startsWith('## ') && !trimmed.startsWith('### ');
      if (isH2) {
        // ## headings always start a new slide
        if (current) slides.push({ section, title: current.title, body: current.body.join("\n\n") });
        current = { title: headingMatch[1].trim(), body: [] };
      } else if (!current) {
        // ### heading with no prior content — use as slide title
        current = { title: headingMatch[1].trim(), body: [] };
      } else {
        // ### heading within existing slide — append to body
        current.body.push(trimmed);
      }
    } else if (current) {
      current.body.push(trimmed);
    } else {
      // No heading found yet — extract first sentence as title
      const firstSentence = trimmed.split(/[.!?\n]/)[0].trim();
      const title = firstSentence.length > 60
        ? firstSentence.slice(0, 57) + "..."
        : firstSentence || (section === "concept" ? "Key Concept" : "Focus Area");
      current = { title, body: [trimmed] };
    }
  }

  if (current) {
    slides.push({ section, title: current.title, body: current.body.join("\n\n") });
  }

  return slides;
}

export function parseQuestions(examQuestions: string | null): Question[] {
  if (!examQuestions) return [];

  const questions: Question[] = [];
  let id = 0;

  // Split by section headers (## or ### — AI sometimes uses either)
  const sections = examQuestions.split(/(?=#{2,3} )/);

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const headerMatch = trimmed.match(/^#{2,3} (.+)/);
    const sectionLabel = headerMatch ? headerMatch[1].trim() : "Questions";
    const content = headerMatch ? trimmed.slice(headerMatch[0].length).trim() : trimmed;

    const type = inferQuestionType(sectionLabel);

    if (type === "mcq") {
      const mcqs = parseMCQs(content, sectionLabel);
      for (const q of mcqs) {
        questions.push({ ...q, id: id++ });
      }
    } else {
      const freeResponse = parseFreeResponse(content, type, sectionLabel);
      for (const q of freeResponse) {
        questions.push({ ...q, id: id++ });
      }
    }
  }

  return questions;
}

function inferQuestionType(label: string): Question["type"] {
  const lower = label.toLowerCase();
  if (lower.includes("multiple choice") || lower.includes("mcq")) return "mcq";
  if (lower.includes("short answer")) return "short_answer";
  if (lower.includes("case")) return "case_analysis";
  if (lower.includes("essay")) return "essay";
  return "short_answer";
}

function parseMCQs(content: string, sectionLabel: string): Omit<Question, "id">[] {
  const questions: Omit<Question, "id">[] = [];

  // Split on question patterns: **Q1.** or **Q1)** or **1.** or plain Q1. / 1.
  const qBlocks = content.split(/(?=(?:\*\*)?Q?\d+[\.\)](?:\*\*)?\s)/);

  for (const block of qBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Extract question text — match bold or plain numbered questions
    // Look ahead for options in A) or A. format
    const qMatch = trimmed.match(/(?:\*\*)?Q?\d+[\.\)](?:\*\*)?\s*([\s\S]*?)(?=\n\s*[-•]?\s*[A-D][)\.])/);
    if (!qMatch) continue;

    const questionText = qMatch[1].trim();

    // Extract options — support A) and A. formats
    const options: string[] = [];
    const optionMatches = trimmed.matchAll(/[-•]?\s*\*?\*?\(?([A-D])[)\.\:]\*?\*?\s*(.+)/g);
    for (const m of optionMatches) {
      options.push(`${m[1]}) ${m[2].trim()}`);
    }

    // Extract answer
    let correctAnswer = "";
    let explanation = "";
    const answerMatch = trimmed.match(/\*\*Answer:?\*\*\s*([A-D])[\s—–\-]*([\s\S]*)$/);
    if (answerMatch) {
      correctAnswer = answerMatch[1];
      explanation = answerMatch[2]?.trim() || "";
    }

    if (questionText && options.length >= 2) {
      questions.push({
        type: "mcq",
        sectionLabel,
        question: questionText,
        options,
        correctAnswer,
        explanation,
      });
    }
  }

  return questions;
}

function parseFreeResponse(
  content: string,
  type: Question["type"],
  sectionLabel: string
): Omit<Question, "id">[] {
  const questions: Omit<Question, "id">[] = [];

  // Split on question patterns — bold or plain numbered
  const qBlocks = content.split(/(?=(?:\*\*)?Q?\d+[\.\)](?:\*\*)?\s)/);

  for (const block of qBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Extract question — bold or plain numbered, up to the answer
    const qMatch = trimmed.match(/(?:\*\*)?Q?\d+[\.\)](?:\*\*)?\s*([\s\S]*?)(?=\*\*Answer:?\*\*|$)/);
    if (!qMatch) continue;

    const questionText = qMatch[1].trim();

    // Extract model answer
    let modelAnswer = "";
    const answerMatch = trimmed.match(/\*\*Answer:?\*\*\s*([\s\S]*?)$/);
    if (answerMatch) {
      modelAnswer = answerMatch[1].trim();
    }

    if (questionText) {
      questions.push({
        type,
        sectionLabel,
        question: questionText,
        modelAnswer,
      });
    }
  }

  return questions;
}
