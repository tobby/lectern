"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  aiStatus: "pending" | "processing" | "done" | "failed";
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  institution: { id: string; name: string } | null;
}

interface ProgressRecord {
  lectureId: string;
  status: "not_started" | "in_progress" | "completed";
}

const AI_STATUS_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  done: { bg: "bg-green-100", text: "text-green-700", label: "Ready" },
  processing: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    label: "Processing",
  },
  pending: { bg: "bg-gray-100", text: "text-gray-500", label: "Pending" },
  failed: { bg: "bg-red-100", text: "text-red-700", label: "Failed" },
};

function PageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-2/3 rounded bg-gray-200" />
      <div className="mt-2 h-4 w-1/3 rounded bg-gray-200" />
      <div className="mt-4 h-20 w-full rounded bg-gray-200" />
      <div className="mt-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 w-full rounded-lg bg-gray-200" />
        ))}
      </div>
    </div>
  );
}

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  const [course, setCourse] = useState<Course | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [progressMap, setProgressMap] = useState<
    Record<string, ProgressRecord>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [courseData, lectureData] = await Promise.all([
          api.get<Course>(`/api/courses/${courseId}`),
          api.get<Lecture[]>(`/api/courses/${courseId}/lectures`),
        ]);
        setCourse(courseData);
        setLectures(lectureData);
      } catch (err: any) {
        setError(err.message || "Failed to load course");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId]);

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700">{error}</p>
        <Link
          href="/courses"
          className="mt-3 inline-block text-sm font-medium text-primary-600 hover:text-primary-500"
        >
          Back to courses
        </Link>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/courses" className="hover:text-primary-600">
          Courses
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{course.title}</span>
      </nav>

      {/* Course header */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
        {course.institution && (
          <p className="mt-1 text-sm text-primary-600 font-medium">
            {course.institution.name}
          </p>
        )}
        {course.description && (
          <p className="mt-3 text-gray-600 leading-relaxed">
            {course.description}
          </p>
        )}
        <div className="mt-4 text-sm text-gray-500">
          {lectures.length} {lectures.length === 1 ? "lecture" : "lectures"}
        </div>
      </div>

      {/* Lectures */}
      <div className="mt-8">
        {lectures.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white py-12 text-center">
            <p className="text-sm text-gray-500">
              No lectures have been added to this course yet.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            {lectures.map((lecture, idx) => {
              const progress = progressMap[lecture.id];
              const statusStyle = AI_STATUS_STYLES[lecture.aiStatus];

              return (
                <Link
                  key={lecture.id}
                  href={`/courses/${courseId}/lectures/${lecture.id}`}
                  className={`flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors ${
                    idx > 0 ? "border-t border-gray-100" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Progress indicator */}
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                        progress?.status === "completed"
                          ? "bg-green-100 text-green-600"
                          : progress?.status === "in_progress"
                            ? "bg-primary-100 text-primary-600"
                            : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {progress?.status === "completed" ? (
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        idx + 1
                      )}
                    </div>

                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {lecture.title}
                      </span>
                      {lecture.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                          {lecture.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                    >
                      {statusStyle.label}
                    </span>
                    <svg
                      className="h-4 w-4 text-gray-300"
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
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
