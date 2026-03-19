"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  institution: { id: string; name: string } | null;
}

interface CoursesResponse {
  courses: Course[];
  page: number;
  limit: number;
}

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="h-5 w-3/4 rounded bg-gray-200" />
      <div className="mt-2 h-4 w-1/2 rounded bg-gray-200" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded bg-gray-200" />
        <div className="h-3 w-5/6 rounded bg-gray-200" />
      </div>
      <div className="mt-6 h-9 w-24 rounded bg-gray-200" />
    </div>
  );
}

export default function BrowseCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<CoursesResponse>("/api/courses?page=1&limit=20"),
      api
        .get<{ courseId: string }[]>("/api/users/me/courses")
        .catch(() => [] as { courseId: string }[]),
    ])
      .then(([coursesData, enrollments]) => {
        setCourses(coursesData.courses);
        const ids = new Set(
          (enrollments as { courseId: string }[]).map((e) => e.courseId)
        );
        setEnrolledIds(ids);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function handleEnroll(courseId: string) {
    setEnrollingId(courseId);
    try {
      await api.post(`/api/courses/${courseId}/enroll`);
      setEnrolledIds((prev) => new Set([...prev, courseId]));
      setToast({ message: "Successfully enrolled!", type: "success" });
    } catch (err: any) {
      if (err.status === 409) {
        setEnrolledIds((prev) => new Set([...prev, courseId]));
        setToast({ message: "You are already enrolled.", type: "success" });
      } else {
        setToast({
          message: err.message || "Failed to enroll",
          type: "error",
        });
      }
    } finally {
      setEnrollingId(null);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Browse Courses</h1>
        <p className="mt-1 text-sm text-gray-500">
          Discover courses and start studying.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 rounded-md px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white py-16 px-6 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9.75m3 0h.008v.008h-.008V15zm0 3H9.75m3 0h.008v.008h-.008V18zM6.75 3.75h-1.5a1.125 1.125 0 00-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h13.5c.621 0 1.125-.504 1.125-1.125V7.875a3.375 3.375 0 00-3.375-3.375h-1.5"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            No courses available
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Check back later for new courses.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const isEnrolled = enrolledIds.has(course.id);
            const isEnrolling = enrollingId === course.id;

            return (
              <div
                key={course.id}
                className="flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-indigo-200"
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  {course.title}
                </h3>

                {course.institution && (
                  <p className="mt-1 text-sm text-gray-500">
                    {course.institution.name}
                  </p>
                )}

                {course.description && (
                  <p className="mt-3 flex-1 text-sm text-gray-600 line-clamp-3">
                    {course.description}
                  </p>
                )}

                <div className="mt-5 pt-4 border-t border-gray-100">
                  {isEnrolled ? (
                    <Link
                      href={`/courses/${course.id}`}
                      className="inline-flex items-center rounded-md bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                      View Course
                      <svg
                        className="ml-1.5 h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleEnroll(course.id)}
                      disabled={isEnrolling}
                      className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isEnrolling ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Enrolling...
                        </>
                      ) : (
                        "Enroll"
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
