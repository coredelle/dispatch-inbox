"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { LoadFields } from "@/types";

const MAX_PDF_BYTES = 10 * 1024 * 1024;

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
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function pickFile(f: File | undefined) {
    setResult(null);
    if (!f) return;
    if (f.type !== "application/pdf") {
      setFile(null);
      setResult({ error: "Only PDF files are supported." });
      return;
    }
    if (f.size > MAX_PDF_BYTES) {
      setFile(null);
      setResult({ error: "PDFs must be 10 MB or smaller." });
      return;
    }
    setFile(f);
  }

  async function extract(body: { text: string } | { filePath: string }) {
    setProgress("Extracting… (usually ~10s)");
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 401) setNeedsLogin(true);
    setResult(await res.json());
  }

  async function run(task: () => Promise<void>) {
    setResult(null);
    setNeedsLogin(false);
    try {
      await task();
    } catch {
      setResult({ error: "Something went wrong. Please try again." });
    } finally {
      setProgress(null);
    }
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    run(() => extract({ text }));
  }

  function submitPdf(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    run(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setNeedsLogin(true);
        return;
      }
      setProgress("Uploading…");
      // Files live under the user's own folder; storage policies enforce this
      const filePath = `${user.id}/${crypto.randomUUID()}.pdf`;
      const { error } = await supabase.storage
        .from("load-documents")
        .upload(filePath, file, { contentType: "application/pdf" });
      if (error) {
        setResult({ error: "Upload failed. Please try again." });
        return;
      }
      await extract({ filePath });
    });
  }

  const busy = progress !== null;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">New load</h1>
      <p className="mt-1 text-muted-foreground">Paste a load email or upload a rate confirmation.</p>

      <Tabs defaultValue="email" className="mt-6">
        <TabsList>
          <TabsTrigger value="email">Paste email</TabsTrigger>
          <TabsTrigger value="pdf">Upload PDF</TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <form onSubmit={submitEmail} className="mt-4 flex flex-col gap-3">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the email here…"
              className="min-h-64 font-mono text-sm"
            />
            <Button type="submit" disabled={busy || !text.trim()} className="self-start">
              {progress ?? "Extract load"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="pdf">
          <form onSubmit={submitPdf} className="mt-4 flex flex-col gap-3">
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInput.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInput.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pickFile(e.dataTransfer.files[0]);
              }}
              className={cn(
                "flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center text-sm text-muted-foreground transition-colors",
                dragging && "border-primary bg-muted",
              )}
            >
              {file ? (
                <span className="text-foreground">{file.name}</span>
              ) : (
                <span>Drop a PDF here, or click to choose one (10 MB max)</span>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            <Button type="submit" disabled={busy || !file} className="self-start">
              {progress ?? "Extract load"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

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
