"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

/**
 * Gazette signup. Posts to `/api/newsletter`, which writes to Supabase.
 * Optimistic on the client, authoritative on the server.
 */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setState("error");
        setMessage(payload.error ?? "Something went wrong. Please try again.");
        return;
      }

      setState("done");
      setMessage("Welcome to the Gazette. Check your inbox.");
      setEmail("");
    } catch {
      setState("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (state === "done") {
    return (
      <p className="mt-5 border border-sage/30 bg-sage/5 px-4 py-3 text-[12.5px] text-sage">
        {message}
      </p>
    );
  }

  return (
    <div className="mt-5">
      <form onSubmit={onSubmit} className="flex">
        <label htmlFor="gazette-email" className="sr-only">
          Email address
        </label>
        <input
          id="gazette-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Your email address"
          className="min-w-0 flex-1 border border-line bg-surface px-3.5 py-3 text-[13px] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="eyebrow flex items-center gap-2 bg-ink px-5 text-white transition-colors hover:bg-terracotta disabled:opacity-60"
        >
          {state === "sending" ? "Joining" : "Join"}
          {state !== "sending" && <ArrowRight size={13} />}
        </button>
      </form>
      <p className="mt-2.5 text-[11px] text-muted">
        Unsubscribe gratefully at any time.
      </p>
      {state === "error" && (
        <p className="mt-2 text-[11.5px] text-terracotta">{message}</p>
      )}
    </div>
  );
}
