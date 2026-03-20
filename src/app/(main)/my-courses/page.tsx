"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Modal } from "@/components/modal";

interface Course {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  createdAt: string;
}

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: string; title: string } | null>(null);
  const [alertModal, setAlertModal] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ courses: Course[] }>("/api/courses?mine=true&limit=50")
      .then((res) => setCourses(res.courses))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
          <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
          <p className="mt-1 text-sm text-gray-500">
            Courses you&apos;ve created{courses.length > 0 && ` (${courses.length})`}
          </p>
        </div>
        <Link
          href="/my-courses/new"
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
        >
          Create Course
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white py-12 text-center">
          <p className="text-gray-500">You haven&apos;t created any courses yet.</p>
          <Link
            href="/my-courses/new"
            className="mt-3 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Create your first course &rarr;
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const isReady = course.status === "published";
            return (
              <div
                key={course.id}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <h3 className="font-semibold text-gray-900 line-clamp-2">
                    {course.title}
                  </h3>
                  <span
                    className={`ml-2 shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      isReady
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {isReady ? "Ready" : "Setting up"}
                  </span>
                </div>

                {course.description && (
                  <p className="mb-4 text-sm text-gray-500 line-clamp-2">
                    {course.description}
                  </p>
                )}

                <p className="mb-4 text-xs text-gray-400">
                  Created {new Date(course.createdAt).toLocaleDateString()}
                </p>

                <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
                  {isReady && (
                    <Link
                      href={`/courses/${course.id}`}
                      className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 transition-colors"
                    >
                      Study
                    </Link>
                  )}
                  <Link
                    href={`/my-courses/${course.id}`}
                    className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Manage
                  </Link>
                  <button
                    onClick={() => setDeleteModal({ id: course.id, title: course.title })}
                    disabled={deleting === course.id}
                    className="ml-auto rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {deleting === course.id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Modal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={() => deleteModal && handleDelete(deleteModal.id)}
        title="Delete Course"
        message={`Are you sure you want to delete "${deleteModal?.title}"? This cannot be undone.`}
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
