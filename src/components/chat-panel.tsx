"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api-client";
import { markdownToHtml } from "@/lib/markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ChatSession {
  id: string;
}

interface ChatPanelProps {
  lectureId: string;
  className?: string;
  compact?: boolean;
  slideContext?: string;
}

export default function ChatPanel({ lectureId, className, compact, slideContext }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState("");
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
  }, [lectureId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function loadHistory() {
    try {
      const data = await api.get<{ session: ChatSession; messages: Message[] }>(
        `/api/lectures/${lectureId}/chat`
      );
      setMessages(data.messages);
    } catch (err: any) {
      if (err.status === 403) {
        setError("You must be enrolled in this course to use chat.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!input.trim() || sending) return;

    const userMessage = input.trim();
    setInput("");
    setError("");

    // Optimistic: add user message (show original without context prefix)
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setSending(true);
    setStreamingText("");

    try {
      const res = await fetch(`/api/lectures/${lectureId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: userMessage, slideContext: slideContext || undefined }),
      });

      if (res.status === 402) {
        setQuotaExhausted(true);
        setSending(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send message");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);

          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              fullText += parsed.text;
              setStreamingText(fullText);
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch {
            // Skip unparseable chunks
          }
        }
      }

      // Replace streaming with final message
      const assistantMsg: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: fullText,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingText("");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden ${className || "h-[500px]"}`}>
      {/* Messages area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2.5">
        {messages.length === 0 && !sending && (
          <div className="text-center py-6 text-xs text-gray-400">
            Ask a question about this lecture.
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`rounded-lg px-3 py-1.5 text-xs leading-relaxed overflow-hidden ${
                msg.role === "user"
                  ? "max-w-[80%] bg-indigo-600 text-white"
                  : "max-w-[90%] bg-gray-50 text-gray-800 border border-gray-100"
              }`}
            >
              {msg.role === "assistant" ? (
                <div
                  className="prose-chat text-xs overflow-x-auto [&_h1]:text-sm [&_h1]:font-semibold [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:text-xs [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-medium [&_h3]:mt-1.5 [&_h3]:mb-0.5 [&>div]:text-xs [&>div]:mb-1.5 [&>div]:leading-relaxed [&_li]:text-xs [&_ul]:my-1 [&_ol]:my-1 [&_strong]:text-xs [&_strong]:font-semibold [&_code]:text-[10px] [&_pre]:text-[10px] [&_pre]:p-2 [&_pre]:my-1.5 [&_table]:text-[10px] [&_th]:px-1.5 [&_th]:py-0.5 [&_td]:px-1.5 [&_td]:py-0.5 [&_hr]:my-1.5 [&_blockquote]:text-xs [&_blockquote]:my-1.5 [&_blockquote]:py-1 [&_blockquote]:pl-3"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.content) }}
                />
              ) : (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming assistant message */}
        {sending && streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-lg bg-gray-50 border border-gray-100 px-3 py-1.5 text-xs text-gray-800 leading-relaxed">
              <div
                className="prose-chat text-xs overflow-x-auto [&_h1]:text-sm [&_h1]:font-semibold [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:text-xs [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-medium [&_h3]:mt-1.5 [&_h3]:mb-0.5 [&>div]:text-xs [&>div]:mb-1.5 [&>div]:leading-relaxed [&_li]:text-xs [&_strong]:text-xs [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(streamingText) }}
              />
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {sending && !streamingText && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-gray-100 px-3 py-2">
              <div className="flex space-x-1">
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error / quota messages */}
      {error && (
        <div className="mx-3 mb-1 rounded bg-red-50 px-2 py-1 text-[10px] text-red-700">
          {error}
        </div>
      )}

      {quotaExhausted && (
        <div className="mx-3 mb-1 rounded bg-amber-50 border border-amber-200 px-2 py-1 text-[10px] text-amber-800">
          Quota exceeded. Purchase a top-up to continue.
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-gray-100 p-2">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={sending || quotaExhausted}
            placeholder={
              quotaExhausted
                ? "Quota exceeded"
                : "Ask about this lecture..."
            }
            className="flex-1 rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending || quotaExhausted}
            className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
