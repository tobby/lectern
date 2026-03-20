"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Modal } from "@/components/modal";

interface User {
  id: string;
  isAdmin: boolean;
}

interface Material {
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
  aiStatus: "pending" | "processing" | "done" | "failed";
}

interface Module {
  id: string;
  title: string;
  lectures: Lecture[];
}

interface Course {
  id: string;
  title: string;
  modules: Module[];
}

interface StudyAid {
  id: string;
  keyConcepts: string | null;
  areasOfConcentration: string | null;
  examQuestions: string | null;
}

interface StudyAidResponse {
  status: "pending" | "processing" | "done" | "failed";
  message?: string;
  studyAid?: StudyAid;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const AI_STATUS_STYLES: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  processing: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

const AI_STATUS_MESSAGES: Record<string, string> = {
  pending: "No materials uploaded yet. Upload materials to generate study aids.",
  processing:
    "Study aid is being generated. This may take a few minutes. Refresh to check progress.",
  failed: "Study aid generation failed. Try re-uploading materials.",
};

export default function LectureManagementPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const lectureId = params.lectureId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [courseName, setCourseName] = useState("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState<string | null>(null);

  // Study aid state
  const [studyAidResponse, setStudyAidResponse] =
    useState<StudyAidResponse | null>(null);
  const [studyAidLoading, setStudyAidLoading] = useState(false);
  const [studyAidEditing, setStudyAidEditing] = useState(false);
  const [studyAidForm, setStudyAidForm] = useState({
    keyConcepts: "",
    areasOfConcentration: "",
    examQuestions: "",
  });
  const [studyAidSaving, setStudyAidSaving] = useState(false);
  const [alertModal, setAlertModal] = useState<string | null>(null);
  const [deleteMaterialModal, setDeleteMaterialModal] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    api
      .get<User>("/api/auth/me")
      .then((u) => {
        if (!u.isAdmin) {
          router.push("/admin");
          return;
        }
        return loadData();
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, courseId, lectureId]);

  async function loadData() {
    try {
      const course = await api.get<Course>(`/api/courses/${courseId}`);
      setCourseName(course.title);

      // Find the lecture in the course data
      let foundLecture: Lecture | null = null;
      for (const mod of course.modules) {
        const found = mod.lectures.find((l) => l.id === lectureId);
        if (found) {
          foundLecture = found;
          break;
        }
      }

      if (!foundLecture) {
        router.push(`/admin/courses/${courseId}`);
        return;
      }

      setLecture(foundLecture);
      await loadStudyAid();
      await loadMaterials();
    } catch {
      router.push(`/admin/courses/${courseId}`);
    }
  }

  async function loadMaterials() {
    // Materials are fetched via course detail, but we need a separate endpoint
    // The materials are stored with lectureId. We'll fetch them by getting the lecture's materials
    // Since there's no GET endpoint for materials list, we fetch the course and extract
    try {
      const course = await api.get<Course>(`/api/courses/${courseId}`);
      // We need a materials list endpoint - for now, materials appear after upload
      // Let's look at what we can actually fetch
    } catch {
      // ignore
    }
  }

  async function loadStudyAid() {
    setStudyAidLoading(true);
    try {
      const res = await api.get<StudyAidResponse>(
        `/api/lectures/${lectureId}/study-aid`
      );
      setStudyAidResponse(res);
      if (res.status === "done" && res.studyAid) {
        setStudyAidForm({
          keyConcepts: res.studyAid.keyConcepts || "",
          areasOfConcentration: res.studyAid.areasOfConcentration || "",
          examQuestions: res.studyAid.examQuestions || "",
        });
      }
    } catch {
      // study aid not found
      setStudyAidResponse({ status: "pending", message: "No study aid available." });
    } finally {
      setStudyAidLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/lectures/${lectureId}/materials`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }

      const material: Material = await res.json();
      setMaterials((prev) => [...prev, material]);

      // Refresh lecture status (AI may now be processing)
      const course = await api.get<Course>(`/api/courses/${courseId}`);
      for (const mod of course.modules) {
        const found = mod.lectures.find((l) => l.id === lectureId);
        if (found) {
          setLecture(found);
          break;
        }
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setAlertModal(message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteMaterial(materialId: string) {
    setDeletingMaterial(materialId);
    try {
      await api.delete(`/api/materials/${materialId}`);
      setMaterials((prev) => prev.filter((m) => m.id !== materialId));

      // Refresh lecture status
      const course = await api.get<Course>(`/api/courses/${courseId}`);
      for (const mod of course.modules) {
        const found = mod.lectures.find((l) => l.id === lectureId);
        if (found) {
          setLecture(found);
          break;
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete material";
      setAlertModal(message);
    } finally {
      setDeletingMaterial(null);
    }
  }

  async function handleSaveStudyAid(e: React.FormEvent) {
    e.preventDefault();
    setStudyAidSaving(true);
    try {
      await api.patch(`/api/lectures/${lectureId}/study-aid`, {
        keyConcepts: studyAidForm.keyConcepts,
        areasOfConcentration: studyAidForm.areasOfConcentration,
        examQuestions: studyAidForm.examQuestions,
      });
      setStudyAidEditing(false);
      await loadStudyAid();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save study aid";
      setAlertModal(message);
    } finally {
      setStudyAidSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!lecture) return null;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Link href="/admin/courses" className="hover:text-gray-700">
            Courses
          </Link>
          <span>/</span>
          <Link
            href={`/admin/courses/${courseId}`}
            className="hover:text-gray-700"
          >
            {courseName}
          </Link>
          <span>/</span>
          <span className="text-gray-900">{lecture.title}</span>
        </div>
      </div>

      {/* Lecture Info */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {lecture.title}
            </h1>
            {lecture.description && (
              <p className="mt-1 text-sm text-gray-500">
                {lecture.description}
              </p>
            )}
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              AI_STATUS_STYLES[lecture.aiStatus]
            }`}
          >
            AI: {lecture.aiStatus}
          </span>
        </div>
      </div>

      {/* Materials Section */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Materials</h2>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {/* Upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Upload Material
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.pptx,.txt"
                onChange={handleUpload}
                disabled={uploading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100 disabled:opacity-50"
              />
              {uploading && (
                <div className="flex items-center gap-2 text-sm text-primary-600">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                  Uploading...
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Supported: PDF, DOCX, PPTX, TXT (max 50MB)
            </p>
          </div>

          {/* Materials List */}
          {materials.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {materials.map((mat) => (
                <div
                  key={mat.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-xs font-medium uppercase text-gray-600">
                      {mat.fileType}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {mat.fileName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(mat.fileSizeBytes)} &middot;{" "}
                        {new Date(mat.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteMaterialModal({ id: mat.id, name: mat.fileName })}
                    disabled={deletingMaterial === mat.id}
                    className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingMaterial === mat.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-gray-400">
              No materials uploaded yet.
            </p>
          )}
        </div>
      </div>

      {/* Study Aid Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Study Aid</h2>
          {studyAidResponse?.status === "done" && !studyAidEditing && (
            <button
              onClick={() => setStudyAidEditing(true)}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {studyAidLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary-600 border-t-transparent" />
            </div>
          ) : studyAidResponse?.status === "done" && studyAidResponse.studyAid ? (
            studyAidEditing ? (
              <form onSubmit={handleSaveStudyAid} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Key Concepts
                  </label>
                  <textarea
                    rows={6}
                    value={studyAidForm.keyConcepts}
                    onChange={(e) =>
                      setStudyAidForm({
                        ...studyAidForm,
                        keyConcepts: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Areas of Concentration
                  </label>
                  <textarea
                    rows={6}
                    value={studyAidForm.areasOfConcentration}
                    onChange={(e) =>
                      setStudyAidForm({
                        ...studyAidForm,
                        areasOfConcentration: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Exam Questions
                  </label>
                  <textarea
                    rows={8}
                    value={studyAidForm.examQuestions}
                    onChange={(e) =>
                      setStudyAidForm({
                        ...studyAidForm,
                        examQuestions: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={studyAidSaving}
                    className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    {studyAidSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStudyAidEditing(false);
                      if (studyAidResponse.studyAid) {
                        setStudyAidForm({
                          keyConcepts:
                            studyAidResponse.studyAid.keyConcepts || "",
                          areasOfConcentration:
                            studyAidResponse.studyAid.areasOfConcentration ||
                            "",
                          examQuestions:
                            studyAidResponse.studyAid.examQuestions || "",
                        });
                      }
                    }}
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">
                    Key Concepts
                  </h3>
                  <div className="mt-2 whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-sm text-gray-800">
                    {studyAidResponse.studyAid.keyConcepts || "No content"}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">
                    Areas of Concentration
                  </h3>
                  <div className="mt-2 whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-sm text-gray-800">
                    {studyAidResponse.studyAid.areasOfConcentration ||
                      "No content"}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">
                    Exam Questions
                  </h3>
                  <div className="mt-2 whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-sm text-gray-800">
                    {studyAidResponse.studyAid.examQuestions || "No content"}
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="py-6 text-center">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                  AI_STATUS_STYLES[studyAidResponse?.status || "pending"]
                }`}
              >
                {studyAidResponse?.status || "pending"}
              </span>
              <p className="mt-3 text-sm text-gray-500">
                {AI_STATUS_MESSAGES[studyAidResponse?.status || "pending"]}
              </p>
              {studyAidResponse?.status !== "pending" && (
                <button
                  onClick={loadStudyAid}
                  className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Refresh Status
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={!!deleteMaterialModal}
        onClose={() => setDeleteMaterialModal(null)}
        onConfirm={() => deleteMaterialModal && handleDeleteMaterial(deleteMaterialModal.id)}
        title="Delete Material"
        message={`Delete material "${deleteMaterialModal?.name}"?`}
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
