import Link from "next/link";
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
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight text-gray-900">
            Lectern
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50" />
        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 sm:pt-28 sm:pb-32">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl sm:leading-[1.1]">
              Your course materials,{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                transformed into lectures
              </span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-gray-600 sm:text-xl">
              Upload your PDFs and docs. Our AI turns them into structured lesson
              notes, practice exams, and a personal tutor that&apos;s available 24/7.
              Study smarter for your next exam.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="w-full rounded-xl bg-indigo-600 px-8 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-200 sm:w-auto"
              >
                Start studying for free
              </Link>
              <Link
                href="/login"
                className="w-full rounded-xl border border-gray-200 bg-white px-8 py-3.5 text-center text-sm font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 sm:w-auto"
              >
                I have an account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-100 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to ace your exams
            </h2>
            <p className="mt-4 text-base text-gray-500">
              Three powerful study modes, one platform.
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {/* Learn */}
            <div className="group rounded-2xl border border-gray-100 bg-gray-50/50 p-8 transition-all hover:border-indigo-100 hover:bg-indigo-50/30 hover:shadow-sm">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Learn</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                AI-generated lecture slides that break down complex topics with
                real-world examples and step-by-step explanations. Like having the
                best professor on demand.
              </p>
            </div>

            {/* Practice */}
            <div className="group rounded-2xl border border-gray-100 bg-gray-50/50 p-8 transition-all hover:border-amber-100 hover:bg-amber-50/30 hover:shadow-sm">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Practice</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                MCQs, short answers, case studies, and essays — all auto-generated
                from your course content with model answers and detailed explanations.
              </p>
            </div>

            {/* Chat */}
            <div className="group rounded-2xl border border-gray-100 bg-gray-50/50 p-8 transition-all hover:border-emerald-100 hover:bg-emerald-50/30 hover:shadow-sm">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Chat</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Ask your AI tutor anything about the lecture. It knows your course
                material inside out and gives concise, exam-relevant answers instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-gray-100 bg-gray-50/50 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              From upload to exam-ready in minutes
            </h2>
          </div>

          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                1
              </div>
              <h3 className="text-base font-semibold text-gray-900">Upload materials</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Drop your lecture PDFs, slides, or Word docs. Any format your
                professor hands out works.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                2
              </div>
              <h3 className="text-base font-semibold text-gray-900">AI builds your lectures</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Our AI analyzes the content and creates structured lessons, exam
                focus guides, and practice questions with model answers.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                3
              </div>
              <h3 className="text-base font-semibold text-gray-900">Study and practice</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Go through the slides, test yourself with quizzes, and ask the AI
                tutor when you get stuck. All in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-100 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Stop cramming. Start understanding.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-gray-500">
            Join students who are using AI to study smarter. Upload your first
            course and see the difference.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-200"
          >
            Get started for free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50/50 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} Lectern. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
