import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lectern — AI-Powered Study Platform",
  description:
    "Upload your course materials and get AI-generated lectures, practice questions, and a personal AI tutor. Study smarter, not harder.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/">
            <Image src="/logo.png" alt="Lectern" width={110} height={32} />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full px-5 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-primary-600 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-primary-700 active:scale-[0.98]"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-16 pb-28 sm:pt-24 sm:pb-36">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-primary-50/60 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-5xl font-bold leading-[1.08] tracking-tight text-gray-900 sm:text-7xl">
              Study smarter,
              <br />
              <span className="text-primary-600">not harder</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-500">
              Upload your course materials and our AI transforms them into
              structured lectures, practice exams, and a personal tutor —
              available 24/7.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="w-full rounded-full bg-primary-600 px-8 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-700 active:scale-[0.98] sm:w-auto"
              >
                Start for free
              </Link>
              <Link
                href="#features"
                className="w-full rounded-full border border-gray-200 px-8 py-3 text-sm font-semibold text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 sm:w-auto"
              >
                See how it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-slate-50 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-primary-600">
            Features
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need to ace your exams
          </h2>

          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            {/* Learn */}
            <div className="rounded-2xl bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-gray-100 transition-all hover:shadow-md">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900">Learn</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                AI-generated lecture slides with real-world examples and
                step-by-step explanations. Like having the best professor
                on demand.
              </p>
            </div>

            {/* Practice */}
            <div className="rounded-2xl bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-gray-100 transition-all hover:shadow-md">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900">Practice</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                MCQs, short answers, case studies, and essays — auto-generated
                from your content with model answers and explanations.
              </p>
            </div>

            {/* Chat */}
            <div className="rounded-2xl bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-gray-100 transition-all hover:shadow-md">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900">Chat</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Ask your AI tutor anything about the lecture. It knows your
                course material and gives exam-relevant answers instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-primary-600">
            How it works
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            From upload to exam-ready in minutes
          </h2>

          <div className="mt-16 grid gap-12 sm:grid-cols-3 sm:gap-8">
            <div className="relative text-center">
              <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                1
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Upload materials</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Drop your lecture PDFs, slides, or Word docs. Any format
                your professor hands out.
              </p>
            </div>

            <div className="relative text-center">
              <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                2
              </div>
              <h3 className="text-sm font-semibold text-gray-900">AI builds your lectures</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Our AI creates structured lessons, exam focus guides, and
                practice questions with model answers.
              </p>
            </div>

            <div className="relative text-center">
              <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                3
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Study and practice</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Go through slides, test yourself with quizzes, and ask the
                AI tutor when you get stuck.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Stop cramming. Start understanding.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-slate-400">
            Join students using AI to study smarter. Upload your first
            course and see the difference.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-full bg-white px-8 py-3 text-sm font-semibold text-slate-900 transition-all hover:bg-slate-100 active:scale-[0.98]"
          >
            Get started for free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Lectern. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/terms" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
