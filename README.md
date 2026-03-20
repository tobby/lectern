# Lectern

AI-powered study platform for university students. Upload course materials, get structured lectures, practice questions, and an AI tutor — automatically.

## What it does

Instructors upload raw course materials (PDFs, Word docs) and Lectern's AI transforms them into complete, exam-ready study aids:

- **Learn** — AI-generated lecture slides that explain concepts with real-world examples, intuition-first teaching, and progressive depth
- **Practice** — Auto-generated quizzes (MCQ, short answer, case analysis, essay) with instant feedback, scoring, and model answers
- **Chat** — A context-aware AI tutor that answers questions about the current slide or topic in real time

The generation pipeline uses Claude Sonnet to analyze source materials, design a pedagogically sequenced curriculum, and produce comprehensive lecture content — not summaries, but full notes a student with zero background could use to pass exams.

## Features

- **AI lecture generation** — Multi-stage agentic pipeline: comprehension, curriculum design, content synthesis, and quality review
- **Three learning modes** — Learn, Practice, and Chat in a single integrated view
- **My Courses** — Any user can create personal courses, upload materials, and generate study aids
- **Admin tools** — Admins manage institution-wide courses visible to all students
- **Institutions** — Organize courses by university or program
- **Payments** — Students get a free chat quota per course and purchase message top-ups via Paystack
- **Auth** — Email/password and Google Sign-In, JWT sessions, email verification, password reset

## AI generation pipeline

When course materials are uploaded, Lectern runs a multi-stage agentic pipeline powered by Claude Sonnet 4 (with extended thinking) to produce complete study aids:

1. **Comprehension analysis** — AI deeply reads all source materials and extracts topics, key insights, common misconceptions, prerequisites, and pedagogical notes. Extended thinking is enabled so the model reasons through the material before responding.

2. **Curriculum design** — Based on the comprehension output, AI organizes topics into 3-6 progressive lectures. Each lecture gets a narrative arc, opening hook, and key takeaways — not just topic groupings, but a story-driven learning sequence.

3. **Content generation** — For each lecture, AI writes 8-12 concept sections with multi-paragraph explanations, real-world examples (naming real companies and scenarios), intuition-first teaching, and step-by-step walkthroughs of formulas and frameworks.

4. **Exam focus areas** — AI generates exam preparation guides per lecture: what examiners test, common mistakes to avoid, how to structure strong answers, and key terms/frameworks that must appear.

5. **Practice questions** — AI creates 10 MCQs, 5 short answer questions, 2 case analysis scenarios, and 2 essay questions per lecture — all with detailed model answers and explanations of why wrong answers are wrong.

6. **Quality review** — AI reviews each lecture's content and scores it on clarity, examples, depth, and usefulness (1-5 each). Sections scoring below 3 are automatically regenerated with targeted feedback.

The pipeline runs asynchronously (fire-and-forget) and supports chunked processing for large documents. Progress is tracked via generation jobs that the frontend polls.

## Tech stack

- **Framework:** Next.js 16 (App Router, TypeScript, Tailwind CSS 4)
- **Database:** PostgreSQL via Drizzle ORM
- **Storage:** Cloudflare R2 (S3-compatible)
- **AI:** Claude Sonnet 4 (generation), Claude Haiku 3.5 (chat)
- **Payments:** Paystack (webhook-based)
- **Auth:** Custom JWT with httpOnly cookies

## Getting started

```bash
cp .env.example .env
# Fill in DATABASE_URL, ANTHROPIC_API_KEY, R2 credentials, and JWT secrets

npm install
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker

```bash
docker build -t lectern .
docker run -p 3000:3000 --env-file .env lectern
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Run migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio |
