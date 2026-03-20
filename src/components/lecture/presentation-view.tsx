"use client";

import { useCallback, useEffect } from "react";
import { markdownToHtml } from "@/lib/markdown";
import MermaidRenderer from "@/components/mermaid-renderer";
import type { Slide } from "@/lib/study-aid-parser";

interface PresentationViewProps {
  slides: Slide[];
  currentSlide: number;
  onSlideChange: (index: number) => void;
  onStartPractice: () => void;
}

export default function PresentationView({
  slides,
  currentSlide,
  onSlideChange,
  onStartPractice,
}: PresentationViewProps) {
  const slide = slides[currentSlide];
  const isFirst = currentSlide === 0;
  const isLast = currentSlide === slides.length - 1;

  // Find section boundaries for progress indicator
  const conceptCount = slides.filter((s) => s.section === "concept").length;
  const isInAreas = slide?.section === "area";

  const goNext = useCallback(() => {
    if (isLast) {
      onStartPractice();
    } else {
      onSlideChange(currentSlide + 1);
    }
  }, [isLast, currentSlide, onSlideChange, onStartPractice]);

  const goPrev = useCallback(() => {
    if (!isFirst) onSlideChange(currentSlide - 1);
  }, [isFirst, currentSlide, onSlideChange]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev]);

  if (!slide || slides.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-sm font-medium">No lesson content available</p>
          <p className="mt-1 text-xs">Content will appear once lectures are generated.</p>
        </div>
      </div>
    );
  }

  const progress = ((currentSlide + 1) / slides.length) * 100;

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="shrink-0 mb-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                !isInAreas
                  ? "bg-primary-100 text-primary-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              Concepts
            </span>
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                isInAreas
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              Focus Areas
            </span>
          </div>
          <span className="text-[10px] text-gray-400">
            {currentSlide + 1}/{slides.length}
          </span>
        </div>
        <div className="h-1 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Slide card */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div
          key={currentSlide}
          className="w-full rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden"
        >
          <MermaidRenderer dependencies={[currentSlide]} />
          {/* Slide header accent */}
          <div
            className={`h-1 ${
              slide.section === "concept"
                ? "bg-gradient-to-r from-primary-500 to-purple-500"
                : "bg-gradient-to-r from-emerald-500 to-teal-500"
            }`}
          />

          <div className="px-5 py-4">
            {/* Section badge + title inline */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`text-[9px] font-semibold uppercase tracking-wider ${
                  slide.section === "concept"
                    ? "text-primary-500"
                    : "text-emerald-600"
                }`}
              >
                {slide.section === "concept" ? "Concept" : "Focus"}
              </span>
              <span className="text-gray-300">|</span>
              <h2 className="text-base font-bold text-gray-900 leading-tight">
                {slide.title}
              </h2>
            </div>

            {/* Body */}
            {slide.body && (
              <div
                className="prose-content text-sm text-gray-600 leading-relaxed [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-gray-800 [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-gray-700 [&_h3]:mt-4 [&_h3]:mb-1.5 [&>div]:text-sm [&>div]:mb-3 [&_li]:text-sm [&_li]:leading-relaxed [&_ul]:my-2 [&_ul]:space-y-1 [&_ol]:my-2 [&_ol]:space-y-1 [&_strong]:text-gray-900 [&_strong]:font-semibold [&_blockquote]:border-l-4 [&_blockquote]:border-primary-200 [&_blockquote]:bg-primary-50 [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:my-3 [&_blockquote]:rounded-r-lg [&_blockquote]:text-sm [&_pre]:text-xs [&_pre]:p-3 [&_pre]:my-3 [&_pre]:rounded-xl [&_code]:text-xs [&_table]:text-xs [&_th]:px-2 [&_th]:py-1.5 [&_td]:px-2 [&_td]:py-1.5 [&_hr]:my-4"
                dangerouslySetInnerHTML={{
                  __html: markdownToHtml(slide.body),
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="shrink-0 mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={isFirst}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <span className="text-sm font-medium text-gray-500">
            {currentSlide + 1} / {slides.length}
          </span>

          <button
            onClick={goNext}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all active:scale-[0.98] ${
              isLast
                ? "bg-primary-600 text-white hover:bg-primary-700"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {isLast ? "Start Practice" : "Next"}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
