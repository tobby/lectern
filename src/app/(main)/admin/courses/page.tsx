"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Modal } from "@/components/modal";

interface User {
  id: string;
  fullName: string;
  email: string;
  isAdmin: boolean;
}

interface Institution {
  id: string;
  name: string;
}

interface GenerationJob {
  inputTokens: number | null;
  outputTokens: number | null;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  isPublic: boolean;
  createdAt: string;
  institution: Institution | null;
}

function formatCost(input: number, output: number): string {
  return (((input / 1_000_000) * 3) + ((output / 1_000_000) * 15)).toFixed(2);
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function AdminCoursesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [jobs, setJobs] = useState<Record<string, GenerationJob>>({});
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: string; title: string } | null>(null);
  const [alertModal, setAlertModal] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<User>("/api/auth/me"),
      api.get<{ courses: Course[] }>("/api/courses?admin=true&limit=50"),
    ])
      .then(async ([u, res]) => {
        if (!u.isAdmin) {
          router.push("/admin");
          return;
        }
        setUser(u);
        setCourses(res.courses);

        // Fetch generation jobs for token/cost data
        const jobResults = await Promise.allSettled(
          res.courses.map((c: Course) =>
            api.get<GenerationJob | null>(`/api/courses/${c.id}/generate`)
              .then((job) => ({ courseId: c.id, job }))
          )
        );
        const jobMap: Record<string, GenerationJob> = {};
        for (const r of jobResults) {
          if (r.status === "fulfilled" && r.value.job) {
            jobMap[r.value.courseId] = r.value.job;
          }
        }
        setJobs(jobMap);
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleDelete(courseId: string) {
    setDeleting(courseId);
    try {
      await api.delete(`/api/courses/${courseId}`);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete course";
      setAlertModal(message);
    } finally {
      setDeleting(null);
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="mt-1 text-sm text-gray-500">
            {courses.length} course{courses.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link
          href="/admin/courses/new"
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
        >
          Create Course
        </Link>
      </div>

      {/* Totals */}
      {(() => {
        const totalIn = Object.values(jobs).reduce((s, j) => s + (j.inputTokens || 0), 0);
        const totalOut = Object.values(jobs).reduce((s, j) => s + (j.outputTokens || 0), 0);
        if (totalIn === 0 && totalOut === 0) return null;
        return (
          <div className="mb-6 flex items-center gap-6 rounded-lg border border-gray-200 bg-white px-5 py-3 shadow-sm text-xs text-gray-500">
            <span>Total: <strong className="text-gray-900">{formatTokens(totalIn + totalOut)}</strong> tokens</span>
            <span>Input: <strong className="text-gray-700">{formatTokens(totalIn)}</strong></span>
            <span>Output: <strong className="text-gray-700">{formatTokens(totalOut)}</strong></span>
            <span>Cost: <strong className="text-gray-900">${formatCost(totalIn, totalOut)}</strong></span>
          </div>
        );
      })()}

      {courses.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white py-12 text-center">
          <p className="text-gray-500">No courses yet.</p>
          <Link
            href="/admin/courses/new"
            className="mt-3 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Create your first course &rarr;
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">
                  Institution
                </th>
                <th className="hidden px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell">
                  Tokens
                </th>
                <th className="hidden px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 lg:table-cell">
                  Cost
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/courses/${course.id}`}
                      className="font-medium text-gray-900 hover:text-primary-600"
                    >
                      {course.title}
                    </Link>
                    {!course.isPublic && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        Private
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        course.status === "published"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {course.status}
                    </span>
                  </td>
                  <td className="hidden px-6 py-4 text-sm text-gray-500 sm:table-cell">
                    {course.institution?.name || "\u2014"}
                  </td>
                  {(() => {
                    const job = jobs[course.id];
                    const inp = job?.inputTokens || 0;
                    const out = job?.outputTokens || 0;
                    const has = inp > 0 || out > 0;
                    return (
                      <>
                        <td className="hidden px-6 py-4 text-right text-sm text-gray-500 md:table-cell">
                          {has ? formatTokens(inp + out) : "\u2014"}
                        </td>
                        <td className="hidden px-6 py-4 text-right text-sm font-medium text-gray-900 lg:table-cell">
                          {has ? `$${formatCost(inp, out)}` : "\u2014"}
                        </td>
                      </>
                    );
                  })()}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/courses/${course.id}`}
                        className="rounded-md px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => setDeleteModal({ id: course.id, title: course.title })}
                        disabled={deleting === course.id}
                        className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {deleting === course.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={() => deleteModal && handleDelete(deleteModal.id)}
        title="Delete Course"
        message={`Are you sure you want to delete "${deleteModal?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />

      <Modal
        open={!!alertModal}
        onClose={() => setAlertModal(null)}
        title="Error"
        message={alertModal || ""}
      />
    </div>
  );
}
