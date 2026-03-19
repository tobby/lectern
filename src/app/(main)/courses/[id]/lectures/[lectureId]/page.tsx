"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { parseSlides, parseQuestions } from "@/lib/study-aid-parser";
import type { Slide, Question } from "@/lib/study-aid-parser";
import PresentationView from "@/components/lecture/presentation-view";
import QuizView from "@/components/lecture/quiz-view";
import ChatPanel from "@/components/chat-panel";

interface StudyAid {
  id: string;
  lectureId: string;
  keyConcepts: string | null;
  areasOfConcentration: string | null;
  examQuestions: string | null;
  generatedAt: string;
}

interface StudyAidResponse {
  status: "done" | "processing" | "failed" | "pending";
  message?: string;
  studyAid?: StudyAid;
}

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  aiStatus: string;
  module: {
    id: string;
    title: string;
    course: {
      id: string;
      title: string;
    };
  };
}

type Mode = "learn" | "practice" | "chat";

function PageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-48 rounded bg-gray-200" />
      <div className="mt-6 h-8 w-2/3 rounded bg-gray-200" />
      <div className="mt-8 h-96 w-full rounded-2xl bg-gray-200" />
    </div>
  );
}

function StatusMessage({
  status,
  message,
}: {
  status: string;
  message: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md">
        {status === "processing" && (
          <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        )}
        {status === "pending" && (
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
        {status === "failed" && (
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
        )}
        <p className="text-lg font-medium text-gray-900">{message}</p>
        <p className="mt-2 text-sm text-gray-500">
          {status === "processing" && "This usually takes a minute or two."}
          {status === "pending" && "Upload materials to generate study aids."}
          {status === "failed" && "Try regenerating the study aids."}
        </p>
      </div>
    </div>
  );
}

export default function LectureStudyAidPage() {
  const params = useParams<{ id: string; lectureId: string }>();
  const { id: courseId, lectureId } = params;

  const [studyAidData, setStudyAidData] = useState<StudyAidResponse | null>(null);
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<Mode>("learn");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Resizable split panel
  const [splitPercent, setSplitPercent] = useState(60);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.round((x / rect.width) * 100);
      setSplitPercent(Math.max(35, Math.min(75, pct)));
    }
    function handleMouseUp() {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Parse content
  const [slides, setSlides] = useState<Slide[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [lectureData, studyData] = await Promise.all([
          api.get<Lecture>(`/api/lectures/${lectureId}`),
          api.get<StudyAidResponse>(`/api/lectures/${lectureId}/study-aid`),
        ]);
        setLecture(lectureData);
        setStudyAidData(studyData);

        if (studyData.status === "done" && studyData.studyAid) {
          const s = studyData.studyAid;
          setSlides(parseSlides(s.keyConcepts, s.areasOfConcentration));
          setQuestions(parseQuestions(s.examQuestions));
        }
      } catch (err: any) {
        setError(err.message || "Failed to load study aid");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [lectureId]);

  async function handleMarkComplete() {
    setCompleting(true);
    try {
      await api.post(`/api/lectures/${lectureId}/progress`, { status: "completed" });
      setCompleted(true);
    } catch {
      // silent fail
    } finally {
      setCompleting(false);
    }
  }

  const handleStartPractice = useCallback(() => {
    setMode("practice");
    setCurrentQuestion(0);
  }, []);

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 p-8 text-center">
        <p className="text-sm text-red-700">{error}</p>
        <Link
          href={`/courses/${courseId}`}
          className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          Back to course
        </Link>
      </div>
    );
  }

  const isReady = studyAidData?.status === "done";

  // Build context string for chat based on current view
  const currentSlideData = slides[currentSlide];
  const currentQuestionData = questions[currentQuestion];
  const slideContext =
    mode === "learn" && currentSlideData
      ? `${currentSlideData.section === "concept" ? "Key Concept" : "Focus Area"}: ${currentSlideData.title}\n\n${currentSlideData.body?.slice(0, 500) || ""}`
      : mode === "practice" && currentQuestionData
        ? `Practice Question (${currentQuestionData.type}): ${currentQuestionData.question.slice(0, 300)}`
        : undefined;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col overflow-hidden -mt-4">
      {/* Header — compact */}
      <div className="shrink-0 flex items-center justify-between py-3">
        <div className="min-w-0">
          <nav className="text-xs text-gray-400 mb-0.5 truncate">
            <Link href="/courses" className="hover:text-indigo-600">Courses</Link>
            <span className="mx-1.5">/</span>
            <Link href={`/courses/${courseId}`} className="hover:text-indigo-600">
              {lecture?.module?.course?.title || "Course"}
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-gray-600">{lecture?.title}</span>
          </nav>
          <h1 className="text-lg font-bold text-gray-900 truncate">{lecture?.title}</h1>
        </div>

        <button
          onClick={handleMarkComplete}
          disabled={completing || completed}
          className={`shrink-0 ml-4 rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
            completed
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm disabled:opacity-50"
          }`}
        >
          {completed ? (
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Done
            </span>
          ) : completing ? "..." : "Complete"}
        </button>
      </div>

      {/* Non-ready states */}
      {studyAidData && !isReady && (
        <StatusMessage
          status={studyAidData.status}
          message={
            studyAidData.status === "processing"
              ? "Generating study aids..."
              : studyAidData.status === "pending"
                ? "Waiting for materials"
                : "Generation failed"
          }
        />
      )}

      {/* Main content */}
      {isReady && (
        <>
          {/* Mode tabs */}
          <div className="shrink-0 mb-3 flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
            {(["learn", "practice", "chat"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                  mode === m
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                } ${m === "chat" ? "lg:hidden" : ""}`}
              >
                {m === "learn" ? "Learn" : m === "practice" ? "Practice" : "Chat"}
              </button>
            ))}
          </div>

          {/* Content + chat — resizable split, fills remaining height */}
          <div ref={containerRef} className="flex flex-1 min-h-0">
            {/* Main content area */}
            <div
              className={`min-w-0 flex flex-col ${mode === "chat" ? "hidden lg:flex" : ""}`}
              style={{ width: `${splitPercent}%` }}
            >
              <div className="flex-1 min-h-0 flex flex-col pr-3">
                {mode === "learn" ? (
                  <PresentationView
                    slides={slides}
                    currentSlide={currentSlide}
                    onSlideChange={setCurrentSlide}
                    onStartPractice={handleStartPractice}
                  />
                ) : mode === "practice" ? (
                  <QuizView
                    questions={questions}
                    currentQuestion={currentQuestion}
                    onQuestionChange={setCurrentQuestion}
                  />
                ) : null}
              </div>
            </div>

            {/* Drag handle — desktop only */}
            <div
              className="hidden lg:flex items-center justify-center w-3 shrink-0 cursor-col-resize group"
              onMouseDown={() => {
                isDragging.current = true;
                document.body.style.cursor = "col-resize";
                document.body.style.userSelect = "none";
              }}
            >
              <div className="w-1 h-12 rounded-full bg-gray-200 group-hover:bg-indigo-400 group-active:bg-indigo-500 transition-colors" />
            </div>

            {/* Chat panel — desktop */}
            <div
              className="hidden lg:flex lg:flex-col min-w-0 pl-3"
              style={{ width: `${100 - splitPercent}%` }}
            >
              <div className="shrink-0 mb-2 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-medium text-gray-500">AI Study Assistant</span>
              </div>
              <ChatPanel
                lectureId={lectureId}
                className="flex-1"
                compact
                slideContext={slideContext}
              />
            </div>

            {/* Mobile chat — full width when chat tab active */}
            {mode === "chat" && (
              <div className="w-full lg:hidden flex flex-col">
                <ChatPanel
                  lectureId={lectureId}
                  className="flex-1"
                  slideContext={slideContext}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
