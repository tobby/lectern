"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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

interface Upload {
  id: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  createdAt: string;
}

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  aiStatus: "pending" | "processing" | "done" | "failed";
}

interface GenerationJob {
  id: string;
  status: "pending" | "processing" | "done" | "failed";
  error: string | null;
  lecturesCreated: number | null;
  startedAt: string | null;
  completedAt: string | null;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  isPublic: boolean;
  inviteCode: string | null;
  institutionId: string | null;
  institution: Institution | null;
  createdAt: string;
}

const AI_STATUS_STYLES: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  processing: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CourseManagementPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [course, setCourse] = useState<Course | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [generationJob, setGenerationJob] = useState<GenerationJob | null>(null);
  const [loading, setLoading] = useState(true);

  // Course edit state
  const [editingCourse, setEditingCourse] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    isPublic: true,
    institutionId: "",
  });
  const [courseSaving, setCourseSaving] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);

  // Generation state
  const [generating, setGenerating] = useState(false);

  // Lecture edit state
  const [editingLectureId, setEditingLectureId] = useState<string | null>(null);
  const [editLectureTitle, setEditLectureTitle] = useState("");
  const [savingLecture, setSavingLecture] = useState(false);

  const fetchCourse = useCallback(async () => {
    try {
      const data = await api.get<Course>(`/api/courses/${courseId}`);
      setCourse(data);
      setCourseForm({
        title: data.title,
        description: data.description || "",
        isPublic: data.isPublic,
        institutionId: data.institutionId || "",
      });
    } catch {
      router.push("/admin/courses");
    }
  }, [courseId, router]);

  const fetchUploads = useCallback(async () => {
    const data = await api.get<Upload[]>(`/api/courses/${courseId}/uploads`);
    setUploads(data);
  }, [courseId]);

  const fetchLectures = useCallback(async () => {
    const data = await api.get<Lecture[]>(`/api/courses/${courseId}/lectures`);
    setLectures(data);
  }, [courseId]);

  const fetchGenerationStatus = useCallback(async () => {
    const data = await api.get<GenerationJob | null>(
      `/api/courses/${courseId}/generate`
    );
    setGenerationJob(data);
    return data;
  }, [courseId]);

  // Poll generation status while processing
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(async () => {
      const job = await fetchGenerationStatus();
      if (job && (job.status === "done" || job.status === "failed")) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        if (job.status === "done") {
          await fetchLectures();
        }
      }
    }, 5000);
  }, [fetchGenerationStatus, fetchLectures]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    Promise.all([
      api.get<User>("/api/auth/me"),
      api.get<Institution[]>("/api/institutions"),
    ])
      .then(async ([user, insts]) => {
        if (!user.isAdmin) {
          router.push("/admin");
          return;
        }
        setInstitutions(insts);
        await Promise.all([
          fetchCourse(),
          fetchUploads(),
          fetchLectures(),
          fetchGenerationStatus(),
        ]);
      })
      .then(() => {
        // Start polling if job is processing
        fetchGenerationStatus().then((job) => {
          if (job && job.status === "processing") {
            startPolling();
          }
        });
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router, fetchCourse, fetchUploads, fetchLectures, fetchGenerationStatus, startPolling]);

  async function handleToggleStatus() {
    if (!course) return;
    const newStatus = course.status === "published" ? "draft" : "published";
    try {
      await api.patch(`/api/courses/${courseId}`, { status: newStatus });
      setCourse({ ...course, status: newStatus });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update status";
      alert(message);
    }
  }

  async function handleSaveCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!courseForm.title.trim()) return;
    setCourseSaving(true);
    try {
      await api.patch(`/api/courses/${courseId}`, {
        title: courseForm.title.trim(),
        description: courseForm.description.trim() || null,
        isPublic: courseForm.isPublic,
        institutionId: courseForm.institutionId || null,
      });
      await fetchCourse();
      setEditingCourse(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update course";
      alert(message);
    } finally {
      setCourseSaving(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadingFiles(Array.from(files).map((f) => f.name));

    try {
      const formData = new FormData();
      for (const file of Array.from(files)) {
        formData.append("files", file);
      }
      const created = await api.upload<Upload[]>(
        `/api/courses/${courseId}/uploads`,
        formData
      );
      setUploads((prev) => [...prev, ...created]);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to upload files";
      alert(message);
    } finally {
      setUploading(false);
      setUploadingFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteUpload(uploadId: string) {
    try {
      await api.delete(`/api/courses/${courseId}/uploads/${uploadId}`);
      setUploads((prev) => prev.filter((u) => u.id !== uploadId));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete upload";
      alert(message);
    }
  }

  async function handleGenerate() {
    if (lectures.length > 0) {
      const confirmed = window.confirm(
        `This will replace ${lectures.length} existing lecture${lectures.length !== 1 ? "s" : ""} and their study aids. Student progress and chat history for those lectures will be lost. Continue?`
      );
      if (!confirmed) return;
    }

    setGenerating(true);
    try {
      const job = await api.post<GenerationJob>(
        `/api/courses/${courseId}/generate`,
        {}
      );
      setGenerationJob(job);
      startPolling();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to start generation";
      alert(message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveLecture(lectureId: string) {
    if (!editLectureTitle.trim()) return;
    setSavingLecture(true);
    try {
      await api.patch(`/api/lectures/${lectureId}`, {
        title: editLectureTitle.trim(),
      });
      setEditingLectureId(null);
      await fetchLectures();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update lecture";
      alert(message);
    } finally {
      setSavingLecture(false);
    }
  }

  async function handleDeleteLecture(lectureId: string, title: string) {
    if (!window.confirm(`Delete lecture "${title}"?`)) return;
    try {
      await api.delete(`/api/lectures/${lectureId}`);
      setLectures((prev) => prev.filter((l) => l.id !== lectureId));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete lecture";
      alert(message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!course) return null;

  const isProcessing = generationJob?.status === "processing";

  return (
    <div className="mx-auto max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/admin/courses"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back to Courses
        </Link>
      </div>

      {/* Course Info Section */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {editingCourse ? (
          <form onSubmit={handleSaveCourse} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                required
                value={courseForm.title}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, title: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                rows={3}
                value={courseForm.description}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, description: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Institution
              </label>
              <select
                value={courseForm.institutionId}
                onChange={(e) =>
                  setCourseForm({
                    ...courseForm,
                    institutionId: e.target.value,
                  })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">None</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={courseForm.isPublic}
                onClick={() =>
                  setCourseForm({
                    ...courseForm,
                    isPublic: !courseForm.isPublic,
                  })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  courseForm.isPublic ? "bg-indigo-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                    courseForm.isPublic ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-sm text-gray-700">Public</span>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={courseSaving}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {courseSaving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditingCourse(false)}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {course.title}
                </h1>
                {course.description && (
                  <p className="mt-1 text-sm text-gray-500">
                    {course.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      course.status === "published"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {course.status}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      course.isPublic
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {course.isPublic ? "Public" : "Private"}
                  </span>
                  {course.institution && (
                    <span className="text-xs text-gray-500">
                      {course.institution.name}
                    </span>
                  )}
                  {course.inviteCode && (
                    <span className="text-xs text-gray-400">
                      Invite: {course.inviteCode}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleToggleStatus}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    course.status === "published"
                      ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                >
                  {course.status === "published" ? "Unpublish" : "Publish"}
                </button>
                <button
                  onClick={() => setEditingCourse(true)}
                  className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Source Materials Section */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Source Materials ({uploads.length})
          </h2>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {uploading ? "Uploading..." : "Upload Files"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.pptx,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Drop zone / upload area */}
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className="mb-4 cursor-pointer rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/30"
        >
          {uploading ? (
            <div>
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              <p className="text-sm text-gray-600">
                Uploading {uploadingFiles.join(", ")}...
              </p>
            </div>
          ) : (
            <>
              <svg
                className="mx-auto mb-3 h-10 w-10 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                />
              </svg>
              <p className="text-sm font-medium text-gray-700">
                Click to upload or drag and drop
              </p>
              <p className="mt-1 text-xs text-gray-500">
                PDF, DOCX, PPTX, TXT (max 50MB each)
              </p>
            </>
          )}
        </div>

        {/* Uploaded files list */}
        {uploads.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            {uploads.map((upload, idx) => (
              <div
                key={upload.id}
                className={`flex items-center justify-between px-4 py-3 ${
                  idx > 0 ? "border-t border-gray-100" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-600">
                    {upload.fileType}
                  </span>
                  <span className="text-sm text-gray-900">
                    {upload.fileName}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatFileSize(upload.fileSizeBytes)}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteUpload(upload.id)}
                  className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Generate button + status */}
        {uploads.length > 0 && (
          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={handleGenerate}
              disabled={isProcessing || generating}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isProcessing
                ? "Generating..."
                : generating
                  ? "Starting..."
                  : "Generate Lectures"}
            </button>

            {generationJob && (
              <div className="flex items-center gap-2">
                {isProcessing && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                )}
                <span
                  className={`text-sm ${
                    generationJob.status === "done"
                      ? "text-green-600"
                      : generationJob.status === "failed"
                        ? "text-red-600"
                        : "text-gray-600"
                  }`}
                >
                  {generationJob.status === "done" &&
                    `${generationJob.lecturesCreated} lecture${generationJob.lecturesCreated !== 1 ? "s" : ""} generated`}
                  {generationJob.status === "failed" &&
                    `Generation failed: ${generationJob.error || "Unknown error"}`}
                  {generationJob.status === "processing" &&
                    (generationJob.error || "Starting generation...")}
                  {generationJob.status === "pending" && "Queued..."}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lectures Section */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Lectures ({lectures.length})
        </h2>
      </div>

      {lectures.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white py-8 text-center">
          <p className="text-sm text-gray-500">
            No lectures yet. Upload source materials and click &quot;Generate
            Lectures&quot; to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          {lectures.map((lecture, idx) => (
            <div
              key={lecture.id}
              className={`flex items-center justify-between px-4 py-3 ${
                idx > 0 ? "border-t border-gray-100" : ""
              }`}
            >
              {editingLectureId === lecture.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="text"
                    value={editLectureTitle}
                    onChange={(e) => setEditLectureTitle(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveLecture(lecture.id);
                      }
                      if (e.key === "Escape") setEditingLectureId(null);
                    }}
                  />
                  <button
                    onClick={() => handleSaveLecture(lecture.id)}
                    disabled={savingLecture}
                    className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {savingLecture ? "..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingLectureId(null)}
                    className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-700">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {lecture.title}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        AI_STATUS_STYLES[lecture.aiStatus]
                      }`}
                    >
                      {lecture.aiStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/admin/courses/${courseId}/lectures/${lecture.id}`}
                      className="rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                    >
                      Manage
                    </Link>
                    <button
                      onClick={() => {
                        setEditingLectureId(lecture.id);
                        setEditLectureTitle(lecture.title);
                      }}
                      className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        handleDeleteLecture(lecture.id, lecture.title)
                      }
                      className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
