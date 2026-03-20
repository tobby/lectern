# Lectern

AI-powered study platform for MBA students. Upload course materials, get structured lectures, practice questions, and an AI tutor — automatically.

## What it does

Instructors upload raw course materials (PDFs, Word docs) and Lectern's AI transforms them into complete, exam-ready study aids:

- **Learn** — AI-generated lecture slides that explain concepts with real-world examples, intuition-first teaching, and progressive depth
- **Practice** — Auto-generated quizzes (MCQ, short answer, case analysis, essay) with instant feedback, scoring, and model answers
- **Chat** — A context-aware AI tutor that answers questions about the current slide or topic in real time

The generation pipeline uses Claude Sonnet to analyze source materials, design a pedagogically sequenced curriculum, and produce comprehensive lecture content — not summaries, but full notes a student with zero background could use to pass exams.

## Features

- **AI lecture generation** — Multi-stage pipeline: comprehension analysis, curriculum design, content synthesis, and quality review
- **Three learning modes** — Learn, Practice, and Chat in a single integrated view
- **Admin tools** — Course/module/lecture management, material uploads, generation monitoring
- **Institutions** — Organize courses by university or program
- **Payments** — Students get a free chat quota per course and purchase message top-ups via Paystack
- **Auth** — Email/password with JWT sessions, email verification, and password reset

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
