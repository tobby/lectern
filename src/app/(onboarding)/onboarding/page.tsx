"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import Image from "next/image";
import Link from "next/link";

const EDUCATION_LEVELS = [
  { value: "high_school", label: "High School" },
  { value: "undergraduate", label: "Undergraduate" },
  { value: "postgraduate", label: "Postgraduate" },
  { value: "professional", label: "Professional" },
];

const LEARNING_GOALS = [
  { value: "exam_prep", label: "Exam Preparation", description: "Focused on passing exams with strong grades" },
  { value: "deep_understanding", label: "Deep Understanding", description: "Want to truly master the subject matter" },
  { value: "quick_review", label: "Quick Review", description: "Need a fast refresher on key concepts" },
];

export default function OnboardingPage() {
  const [educationLevel, setEducationLevel] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [learningGoal, setLearningGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!educationLevel) {
      setError("Please select your education level.");
      return;
    }

    setSaving(true);
    try {
      await api.patch("/api/users/me/profile", {
        educationLevel,
        fieldOfStudy: fieldOfStudy.trim() || null,
        learningGoal: learningGoal || null,
      });
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-6 py-6">
        <Link href="/">
          <Image src="/logo.png" alt="Lectern" width={110} height={32} />
        </Link>
      </div>

      <div className="flex items-center justify-center px-4 pb-16 pt-4 sm:pt-8">
        <div className="w-full max-w-[480px]">
          <div className="rounded-2xl border border-slate-200/80 bg-white px-8 py-10 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Tell us about yourself
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              This helps us tailor your study materials to your level.
            </p>

            {error && (
              <div className="mt-5 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-7 space-y-6">
              {/* Education Level */}
              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">
                  Education level <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {EDUCATION_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setEducationLevel(level.value)}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                        educationLevel === level.value
                          ? "border-primary-500 bg-primary-50 text-primary-700 ring-1 ring-primary-200"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field of Study */}
              <div>
                <label htmlFor="fieldOfStudy" className="block text-[13px] font-medium text-slate-600 mb-1.5">
                  Field of study
                </label>
                <input
                  id="fieldOfStudy"
                  type="text"
                  value={fieldOfStudy}
                  onChange={(e) => setFieldOfStudy(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100"
                  placeholder="e.g. Computer Science, Business, Medicine"
                />
              </div>

              {/* Learning Goal */}
              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">
                  Learning goal
                </label>
                <div className="space-y-2">
                  {LEARNING_GOALS.map((goal) => (
                    <button
                      key={goal.value}
                      type="button"
                      onClick={() => setLearningGoal(goal.value)}
                      className={`flex w-full items-start rounded-lg border px-4 py-3 text-left transition-all ${
                        learningGoal === goal.value
                          ? "border-primary-500 bg-primary-50 ring-1 ring-primary-200"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <p className={`text-sm font-medium ${
                          learningGoal === goal.value ? "text-primary-700" : "text-slate-700"
                        }`}>
                          {goal.label}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{goal.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Continue"}
              </button>

              <button
                type="button"
                onClick={async () => {
                  await api.patch("/api/users/me/profile", {
                    educationLevel: "undergraduate",
                  });
                  window.location.href = "/dashboard";
                }}
                className="w-full text-center text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                Skip for now
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
