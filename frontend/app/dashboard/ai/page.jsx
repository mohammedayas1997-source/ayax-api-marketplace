"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Send,
  Sparkles,
  Trash2,
  User,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

export default function AiPage() {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello 👋 I am AYAX AI. I can help you with information about AYAX APIs, services, wallet, documentation, and other features related to AYAX.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [previousResponseId, setPreviousResponseId] =
    useState(null);

  const [copiedId, setCopiedId] = useState(null);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const sendMessage = async () => {
    const message = input.trim();

    if (!message || loading) return;

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setInput("");
    setLoading(true);

    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("token")
          : null;

      const response = await fetch(
        `${API_URL}/ai/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
          body: JSON.stringify({
            message,
            previousResponseId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Unable to contact AYAX AI."
        );
      }

      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          result.data?.response ||
          "I could not generate a response.",
      };

      setMessages((prev) => [
        ...prev,
        assistantMessage,
      ]);

      if (result.data?.responseId) {
        setPreviousResponseId(
          result.data.responseId
        );
      }
    } catch (error) {
      console.error("AYAX AI frontend error:", error);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "error",
          content:
            error?.message ||
            "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  };

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-new",
        role: "assistant",
        content:
          "Chat cleared 👋 I am AYAX AI. How can I help you today?",
      },
    ]);

    setPreviousResponseId(null);
  };

  const copyMessage = async (
    message,
    id
  ) => {
    try {
      await navigator.clipboard.writeText(
        message
      );

      setCopiedId(id);

      setTimeout(() => {
        setCopiedId(null);
      }, 1500);
    } catch (error) {
      console.error(
        "Copy failed:",
        error
      );
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-4 sm:px-6 lg:px-8">

        {/* HEADER */}
        <header className="mb-4 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-4 shadow-xl backdrop-blur sm:px-6">

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20">
              <Bot size={24} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold sm:text-xl">
                  AYAX AI
                </h1>

                <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-400">
                  ONLINE
                </span>
              </div>

              <p className="text-xs text-slate-400">
                AYAX Digital Solutions Assistant
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={clearChat}
            className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">
              Clear
            </span>
          </button>
        </header>

        {/* CHAT */}
        <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl">

          {/* MESSAGES */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">

            {messages.map((message) => {
              const isUser =
                message.role === "user";

              const isError =
                message.role === "error";

              return (
                <div
                  key={message.id}
                  className={`mb-6 flex gap-3 ${
                    isUser
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >

                  {!isUser && (
                    <div
                      className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        isError
                          ? "bg-red-500/10 text-red-400"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      {isError ? (
                        <AlertCircle size={18} />
                      ) : (
                        <Bot size={18} />
                      )}
                    </div>
                  )}

                  <div
                    className={`group max-w-[85%] sm:max-w-[75%] ${
                      isUser
                        ? "items-end"
                        : "items-start"
                    }`}
                  >

                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-7 ${
                        isUser
                          ? "rounded-br-md bg-blue-600 text-white"
                          : isError
                          ? "rounded-bl-md border border-red-500/20 bg-red-500/10 text-red-300"
                          : "rounded-bl-md border border-slate-800 bg-slate-950 text-slate-200"
                      }`}
                    >
                      {message.content}
                    </div>

                    {!isUser &&
                      !isError && (
                        <button
                          type="button"
                          onClick={() =>
                            copyMessage(
                              message.content,
                              message.id
                            )
                          }
                          className="mt-2 flex items-center gap-1 text-xs text-slate-500 opacity-0 transition group-hover:opacity-100 hover:text-slate-300"
                        >
                          {copiedId ===
                          message.id ? (
                            <>
                              <Check
                                size={13}
                              />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy
                                size={13}
                              />
                              Copy
                            </>
                          )}
                        </button>
                      )}
                  </div>

                  {isUser && (
                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-700 text-slate-200">
                      <User size={18} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* TYPING */}
            {loading && (
              <div className="mb-6 flex gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
                  <Bot size={18} />
                </div>

                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-slate-800 bg-slate-950 px-5 py-4">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* SUGGESTIONS */}
          <div className="border-t border-slate-800 px-4 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1">

              {[
                "What are AYAX APIs?",
                "How do I fund my wallet?",
                "What APIs do you offer?",
                "How do I start using the API?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setInput(suggestion);
                    textareaRef.current?.focus();
                  }}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 transition hover:border-blue-500 hover:text-blue-400 disabled:opacity-50"
                >
                  <Sparkles size={13} />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* INPUT */}
          <div className="border-t border-slate-800 p-4">
            <div className="flex items-end gap-3 rounded-2xl border border-slate-700 bg-slate-950 p-2 transition focus-within:border-blue-500">

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onKeyDown={handleKeyDown}
                disabled={loading}
                rows={1}
                placeholder="Ask AYAX AI..."
                className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500"
              />

              <button
                type="button"
                onClick={sendMessage}
                disabled={
                  loading ||
                  !input.trim()
                }
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={18} />
              </button>
            </div>

            <p className="mt-2 text-center text-[11px] text-slate-600">
              AYAX AI may make mistakes. Verify important information.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
