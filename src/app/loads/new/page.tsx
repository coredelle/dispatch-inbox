"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { LoadFields } from "@/types";

interface ExtractResponse {
  loadId?: string;
  status?: string;
  fields?: LoadFields | null;
  error?: string | null;
  run?: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    estCostUsd: number;
    stopReason: string;
  };
}

export default function NewLoadPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setNeedsLogin(false);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.status === 401) setNeedsLogin(true);
      setResult(await res.json());
    } catch {
      setResult({ error: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">New load</h1>
      <p className="mt-1 text-muted-foreground">Paste a load request email.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste the email here…"
          className="min-h-64 font-mono text-sm"
        />
        <Button type="submit" disabled={loading || !text.trim()} className="self-start">
          {loading ? "Extracting… (usually ~10s)" : "Extract load"}
        </Button>
      </form>

      {needsLogin && (
        <p className="mt-4 text-sm">
          <Link href="/login" className="underline">Sign in</Link> to extract loads.
        </p>
      )}

      {result && !needsLogin && (
        <section className="mt-8 space-y-3">
          {result.error && <p className="text-sm text-destructive">{result.error}</p>}
          {result.run && (
            <p className="text-sm text-muted-foreground">
              {result.run.model} · {result.run.inputTokens} in / {result.run.outputTokens} out ·{" "}
              {(result.run.latencyMs / 1000).toFixed(1)}s · ${result.run.estCostUsd.toFixed(4)} ·
              stop: {result.run.stopReason}
            </p>
          )}
          {result.fields && (
            <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-xs">
              {JSON.stringify(result.fields, null, 2)}
            </pre>
          )}
        </section>
      )}
    </main>
  );
}
