"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";

interface User {
  id: string;
  isAdmin: boolean;
}

interface Institution {
  id: string;
  name: string;
  country: string | null;
}

interface CourseResponse {
  id: string;
  title: string;
}

export default function NewCoursePage() {
  const router = useRouter();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [institutionId, setInstitutionId] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<User>("/api/auth/me"),
      api.get<Institution[]>("/api/institutions"),
    ])
      .then(([user, insts]) => {
        if (!user.isAdmin) {
          router.push("/admin");
          return;
        }
        setInstitutions(insts);
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Course title is required.");
      return;
    }

    setSubmitting(true);
    try {
      const course = await api.post<CourseResponse>("/api/courses", {
        title: title.trim(),
        description: description.trim() || null,
        isPublic,
        institutionId: institutionId || null,
      });
      router.push(`/admin/courses/${course.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create course";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/admin/courses"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back to Courses
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Create New Course
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      >
        {error && (
          <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700"
          >
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            placeholder="e.g. Introduction to Finance"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            placeholder="Describe what this course covers..."
          />
        </div>

        <div>
          <label
            htmlFor="institutionId"
            className="block text-sm font-medium text-gray-700"
          >
            Institution
          </label>
          <select
            id="institutionId"
            value={institutionId}
            onChange={(e) => setInstitutionId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">None</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name}
                {inst.country ? ` (${inst.country})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={isPublic}
            onClick={() => setIsPublic(!isPublic)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              isPublic ? "bg-indigo-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                isPublic ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <label className="text-sm font-medium text-gray-700">
            Public course
          </label>
          <span className="text-xs text-gray-500">
            {isPublic
              ? "Anyone can find and enroll in this course"
              : "Only users with an invite code can access"}
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
          <Link
            href="/admin/courses"
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Creating..." : "Create Course"}
          </button>
        </div>
      </form>
    </div>
  );
}
