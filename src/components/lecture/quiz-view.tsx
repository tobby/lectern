"use client";

import { useState, useCallback, useEffect } from "react";
import { markdownToHtml } from "@/lib/markdown";
import type { Question } from "@/lib/study-aid-parser";

interface QuizViewProps {
  questions: Question[];
  currentQuestion: number;
  onQuestionChange: (index: number) => void;
  answerMode?: "hidden" | "visible";
}

interface MCQAnswer {
  selected: string;
  submitted: boolean;
}

export default function QuizView({
  questions,
  currentQuestion,
  onQuestionChange,
  answerMode = "hidden",
}: QuizViewProps) {
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, MCQAnswer>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [showSummary, setShowSummary] = useState(false);

  // Reset state when questions change (e.g., navigating to a different lecture)
  useEffect(() => {
    setMcqAnswers({});
    setShowSummary(false);

    // Auto-reveal free response answers if answer_mode is "visible"
    if (answerMode === "visible") {
      const autoRevealed: Record<number, boolean> = {};
      questions.forEach((q) => {
        if (q.type !== "mcq") autoRevealed[q.id] = true;
      });
      setRevealed(autoRevealed);
    } else {
      setRevealed({});
    }
  }, [questions, answerMode]);

  const question = questions[currentQuestion];
  const isFirst = currentQuestion === 0;
  const isLast = currentQuestion === questions.length - 1;

  const goNext = useCallback(() => {
    if (isLast) {
      setShowSummary(true);
    } else {
      onQuestionChange(currentQuestion + 1);
    }
  }, [isLast, currentQuestion, onQuestionChange]);

  const goPrev = useCallback(() => {
    if (showSummary) {
      setShowSummary(false);
    } else if (!isFirst) {
      onQuestionChange(currentQuestion - 1);
    }
  }, [showSummary, isFirst, currentQuestion, onQuestionChange]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev]);

  function handleMCQSelect(questionId: number, option: string) {
    if (mcqAnswers[questionId]?.submitted) return;
    setMcqAnswers((prev) => ({
      ...prev,
      [questionId]: { selected: option, submitted: false },
    }));
  }

  function handleMCQSubmit(questionId: number) {
    setMcqAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], submitted: true },
    }));
  }

  function handleReveal(questionId: number) {
    setRevealed((prev) => ({ ...prev, [questionId]: true }));
  }

  function handleRetry() {
    setMcqAnswers({});
    setRevealed({});
    setShowSummary(false);
    onQuestionChange(0);
  }

  // Extract letter from option string like "A) Option text" → "A"
  function getSelectedLetter(option: string | undefined): string {
    if (!option) return "";
    const m = option.match(/^([A-Da-d])\)/);
    return m ? m[1].toUpperCase() : "";
  }

  // Score calculation
  const mcqQuestions = questions.filter((q) => q.type === "mcq");
  const answeredMCQs = mcqQuestions.filter(
    (q) => mcqAnswers[q.id]?.submitted
  );
  const correctMCQs = answeredMCQs.filter(
    (q) => getSelectedLetter(mcqAnswers[q.id]?.selected) === q.correctAnswer
  );

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">No practice questions available</p>
          <p className="mt-1 text-sm">Questions will appear once study aids are generated.</p>
        </div>
      </div>
    );
  }

  // Summary screen
  if (showSummary) {
    const percentage = mcqQuestions.length > 0
      ? Math.round((correctMCQs.length / mcqQuestions.length) * 100)
      : 0;

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-start justify-center">
          <div className="w-full rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="px-5 py-4">
              <h2 className="text-base font-bold text-gray-900 mb-1">
                Quiz Complete
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Here&apos;s how you did on the practice questions.
              </p>

              {/* Score card */}
              {mcqQuestions.length > 0 && (
                <div className="mb-4 rounded-lg bg-gradient-to-br from-primary-50 to-purple-50 border border-primary-100 p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                      <span className="text-lg font-bold text-primary-600">
                        {percentage}%
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {correctMCQs.length} of {mcqQuestions.length} correct
                      </p>
                      <p className="text-xs text-gray-500">Multiple choice questions</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Question list */}
              <div className="space-y-1">
                {questions.map((q, idx) => {
                  const mcq = mcqAnswers[q.id];
                  const isCorrect =
                    q.type === "mcq" && mcq?.submitted && getSelectedLetter(mcq.selected) === q.correctAnswer;
                  const isWrong =
                    q.type === "mcq" && mcq?.submitted && getSelectedLetter(mcq.selected) !== q.correctAnswer;

                  return (
                    <button
                      key={q.id}
                      onClick={() => { setShowSummary(false); onQuestionChange(idx); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium">
                        {isCorrect ? (
                          <span className="text-green-600">✓</span>
                        ) : isWrong ? (
                          <span className="text-red-500">✗</span>
                        ) : (
                          <span className="text-gray-400">{idx + 1}</span>
                        )}
                      </span>
                      <span className="flex-1 text-xs text-gray-700 truncate">
                        {q.question.slice(0, 80)}
                        {q.question.length > 80 ? "..." : ""}
                      </span>
                      <span className="text-[9px] font-medium text-gray-400 uppercase">
                        {q.type.replace("_", " ")}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleRetry}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
                >
                  Retry Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!question) return null;

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const mcqAnswer = mcqAnswers[question.id];
  const isRevealed = revealed[question.id];

  return (
    <div className="flex flex-col h-full">
      {/* Progress */}
      <div className="shrink-0 mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium text-gray-500">
            {question.sectionLabel}
          </span>
          <span className="text-[10px] text-gray-400 font-medium">
            Question {currentQuestion + 1} of {questions.length}
          </span>
        </div>
        <div className="h-1 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div
          key={currentQuestion}
          className="w-full rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300"
        >
          <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="px-5 py-4">
            {/* Type badge */}
            <span className="inline-block text-[9px] font-semibold uppercase tracking-wider mb-2 text-amber-600">
              {question.type.replace("_", " ")}
            </span>

            {/* Question */}
            <div
              className="text-sm font-medium text-gray-900 mb-4 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: markdownToHtml(question.question),
              }}
            />

            {/* MCQ options */}
            {question.type === "mcq" && question.options && (
              <div className="space-y-2 mb-4">
                {question.options.map((option, idx) => {
                  const letterMatch = option.match(/^([A-Da-d])\)\s*/);
                  const letter = letterMatch?.[1]?.toUpperCase() || "";
                  const isSelected = mcqAnswer?.selected === option;
                  const isSubmitted = mcqAnswer?.submitted;
                  const isCorrectOption = letter === question.correctAnswer;

                  let optionStyle = "border-gray-200 hover:border-primary-300 hover:bg-primary-50/50";
                  if (isSubmitted && isCorrectOption) {
                    optionStyle = "border-green-300 bg-green-50";
                  } else if (isSubmitted && isSelected && !isCorrectOption) {
                    optionStyle = "border-red-300 bg-red-50";
                  } else if (isSelected && !isSubmitted) {
                    optionStyle = "border-primary-400 bg-primary-50 ring-1 ring-primary-400";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleMCQSelect(question.id, option)}
                      disabled={isSubmitted}
                      className={`flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-left transition-all ${optionStyle}`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          isSubmitted && isCorrectOption
                            ? "bg-green-100 text-green-700"
                            : isSubmitted && isSelected
                              ? "bg-red-100 text-red-700"
                              : isSelected
                                ? "bg-primary-100 text-primary-700"
                                : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="text-sm text-gray-800">
                        {letterMatch ? option.slice(letterMatch[0].length) : option}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* MCQ submit / explanation */}
            {question.type === "mcq" && (
              <>
                {!mcqAnswer?.submitted && mcqAnswer?.selected && (
                  <button
                    onClick={() => handleMCQSubmit(question.id)}
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
                  >
                    Check Answer
                  </button>
                )}
                {mcqAnswer?.submitted && question.explanation && (
                  <div className="mt-3 rounded-lg bg-blue-50 border border-blue-100 p-4">
                    <p className="text-[9px] font-semibold uppercase text-blue-600 mb-1">
                      Explanation
                    </p>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      {question.explanation}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Free response reveal */}
            {question.type !== "mcq" && (
              <>
                {!isRevealed ? (
                  <button
                    onClick={() => handleReveal(question.id)}
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
                  >
                    Reveal Answer
                  </button>
                ) : (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4 animate-in fade-in duration-300">
                    <p className="text-[9px] font-semibold uppercase text-emerald-600 mb-1">
                      Model Answer
                    </p>
                    <div
                      className="text-sm text-emerald-800 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: markdownToHtml(question.modelAnswer || ""),
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="shrink-0 flex items-center justify-between mt-2 pt-1">
        <button
          onClick={goPrev}
          disabled={isFirst}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </button>

        <div className="flex items-center gap-0.5">
          {questions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => onQuestionChange(idx)}
              className={`rounded-full transition-all duration-200 ${
                idx === currentQuestion
                  ? "h-2 w-2 bg-amber-500"
                  : "h-1 w-1 bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            isLast
              ? "bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
              : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          {isLast ? "Results" : "Next"}
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
