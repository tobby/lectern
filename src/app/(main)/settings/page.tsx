"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";

interface Profile {
  id: string;
  fullName: string;
  email: string;
  educationLevel: string | null;
  fieldOfStudy: string | null;
  learningGoal: string | null;
}

interface Preferences {
  answer_mode: string;
  question_order: string;
  question_filter: string;
  view_mode: string;
}

const EDUCATION_LEVELS = [
  { value: "high_school", label: "High School" },
  { value: "undergraduate", label: "Undergraduate" },
  { value: "postgraduate", label: "Postgraduate" },
  { value: "professional", label: "Professional" },
];

const LEARNING_GOALS = [
  { value: "exam_prep", label: "Exam Preparation" },
  { value: "deep_understanding", label: "Deep Understanding" },
  { value: "quick_review", label: "Quick Review" },
];

const DEFAULT_PREFERENCES: Preferences = {
  answer_mode: "hidden",
  question_order: "default",
  question_filter: "all",
  view_mode: "detailed",
};

type Tab = "profile" | "preferences" | "account";

const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
  {
    value: "profile",
    label: "Profile",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    value: "preferences",
    label: "Preferences",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
      </svg>
    ),
  },
  {
    value: "account",
    label: "Account",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // Profile state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    educationLevel: "",
    fieldOfStudy: "",
    learningGoal: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Preferences state
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  // Google link status
  const [hasGoogle, setHasGoogle] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Profile>("/api/users/me/profile"),
      api.get<Preferences>("/api/users/me/preferences"),
      api.get<{ hasGoogleLinked?: boolean }>("/api/auth/me"),
    ])
      .then(([prof, pref, me]) => {
        setProfile(prof);
        setProfileForm({
          fullName: prof.fullName || "",
          educationLevel: prof.educationLevel || "",
          fieldOfStudy: prof.fieldOfStudy || "",
          learningGoal: prof.learningGoal || "",
        });
        setPrefs(pref);
        setHasGoogle(!!me.hasGoogleLinked);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSaved(false);
    try {
      await api.patch("/api/users/me/profile", {
        fullName: profileForm.fullName.trim(),
        educationLevel: profileForm.educationLevel || null,
        fieldOfStudy: profileForm.fieldOfStudy.trim() || null,
        learningGoal: profileForm.learningGoal || null,
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to save profile");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePrefsSave(e: React.FormEvent) {
    e.preventDefault();
    setPrefsSaving(true);
    setPrefsSaved(false);
    try {
      await api.patch("/api/users/me/preferences", prefs);
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to save preferences");
    } finally {
      setPrefsSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your profile and study preferences.</p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <nav className="w-48 shrink-0">
          <div className="sticky top-20 space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.value
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Profile */}
          {activeTab === "profile" && (
            <form onSubmit={handleProfileSave} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">Profile</h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-sm text-gray-500 bg-gray-50 rounded-md px-3 py-2 border border-gray-200">
                    {profile?.email}
                  </p>
                </div>

                <div>
                  <label htmlFor="educationLevel" className="block text-sm font-medium text-gray-700 mb-1">Education level</label>
                  <select
                    id="educationLevel"
                    value={profileForm.educationLevel}
                    onChange={(e) => setProfileForm({ ...profileForm, educationLevel: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  >
                    <option value="">Not set</option>
                    {EDUCATION_LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="fieldOfStudy" className="block text-sm font-medium text-gray-700 mb-1">Field of study</label>
                  <input
                    id="fieldOfStudy"
                    type="text"
                    value={profileForm.fieldOfStudy}
                    onChange={(e) => setProfileForm({ ...profileForm, fieldOfStudy: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                    placeholder="e.g. Computer Science, Business, Medicine"
                  />
                </div>

                <div>
                  <label htmlFor="learningGoal" className="block text-sm font-medium text-gray-700 mb-1">Learning goal</label>
                  <select
                    id="learningGoal"
                    value={profileForm.learningGoal}
                    onChange={(e) => setProfileForm({ ...profileForm, learningGoal: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  >
                    <option value="">Not set</option>
                    {LEARNING_GOALS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {profileSaving ? "Saving..." : "Save"}
                </button>
                {profileSaved && <span className="text-sm text-green-600">Saved</span>}
              </div>
            </form>
          )}

          {/* Preferences */}
          {activeTab === "preferences" && (
            <form onSubmit={handlePrefsSave} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">Study Preferences</h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="answer_mode" className="block text-sm font-medium text-gray-700 mb-1">Answer visibility</label>
                  <select
                    id="answer_mode"
                    value={prefs.answer_mode}
                    onChange={(e) => setPrefs({ ...prefs, answer_mode: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  >
                    <option value="hidden">Hidden until revealed</option>
                    <option value="visible">Always visible</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="question_order" className="block text-sm font-medium text-gray-700 mb-1">Question order</label>
                  <select
                    id="question_order"
                    value={prefs.question_order}
                    onChange={(e) => setPrefs({ ...prefs, question_order: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  >
                    <option value="default">Default order</option>
                    <option value="randomized">Randomized</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="question_filter" className="block text-sm font-medium text-gray-700 mb-1">Question types</label>
                  <select
                    id="question_filter"
                    value={prefs.question_filter}
                    onChange={(e) => setPrefs({ ...prefs, question_filter: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  >
                    <option value="all">All types</option>
                    <option value="mcq">Multiple choice only</option>
                    <option value="short_answer">Short answer only</option>
                    <option value="essay">Essay only</option>
                  </select>
                </div>

              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={prefsSaving}
                  className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {prefsSaving ? "Saving..." : "Save"}
                </button>
                {prefsSaved && <span className="text-sm text-green-600">Saved</span>}
              </div>
            </form>
          )}

          {/* Account */}
          {activeTab === "account" && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">Account</h2>

              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Google Account</p>
                    <p className="text-xs text-gray-500">
                      {hasGoogle ? "Linked — you can sign in with Google" : "Not linked"}
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    hasGoogle ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {hasGoogle ? "Connected" : "Not connected"}
                  </span>
                </div>

                <div className="border-t border-gray-100 pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Password</p>
                      <p className="text-xs text-gray-500">Reset your password via email</p>
                    </div>
                    <Link
                      href="/forgot-password"
                      className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      Reset Password
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
