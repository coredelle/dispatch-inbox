"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SAMPLES, type Sample } from "@/lib/samples";
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
  const [tab, setTab] = useState("email");
  const [loadingSample, setLoadingSample] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

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

  // Fills the form with a fictional sample, ready to extract
  async function loadSample(sample: Sample) {
    setResult(null);
    setLoadingSample(sample.id);
    try {
      const res = await fetch(`/samples/${sample.id}`);
      if (!res.ok) throw new Error();
      if (sample.kind === "pdf") {
        const blob = await res.blob();
        setFile(new File([blob], sample.file.split("/").pop()!, { type: "application/pdf" }));
        setTab("pdf");
      } else {
        setText(await res.text());
        setTab("email");
      }
    } catch {
      setResult({ error: "Couldn't load that sample. Please try again." });
    } finally {
      setLoadingSample(null);
    }
  }

  async function extract(body: { text: string } | { filePath: string }) {
    setProgress("Extracting… (about 10 seconds)");
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 401) setNeedsLogin(true);
    const data: ExtractResponse = await res.json();
    // Successful extraction goes straight to the review screen
    if (data.loadId && data.fields) {
      setProgress("Opening review…");
      router.push(`/loads/${data.loadId}`);
      return;
    }
    setResult(data);
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
    <div className="flex min-h-screen flex-col">
      <SiteHeader>
        <Link href="/inbox" className="underline-offset-4 hover:underline">← Load ledger</Link>
      </SiteHeader>
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <span className="eyebrow">Intake</span>
      <h1 className="doc-title text-5xl">New load</h1>
      <p className="mt-2 text-muted-foreground">
        Paste a load email or drop in a rate confirmation. No load email handy? Pick a sample. They&apos;re all fictional.
        Demo sandboxes are private and deleted within two days.
      </p>

      <div className="mt-5 flex flex-col gap-2">
        <span className="eyebrow">Try a sample</span>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {SAMPLES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              disabled={busy || loadingSample !== null}
              onClick={() => loadSample(sample)}
              className="sheet flex flex-col items-start gap-0.5 rounded-sm px-3 py-2 text-left transition-colors hover:border-foreground hover:bg-hivis/15 focus-visible:border-foreground focus-visible:outline-none disabled:opacity-60"
            >
              <span className="doc-title text-lg">{loadingSample === sample.id ? "Loading…" : sample.label}</span>
              <span className="text-xs text-muted-foreground">{sample.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))} className="mt-6">
        <TabsList variant="line" className="gap-4">
          <TabsTrigger value="email" className="font-display text-lg font-semibold uppercase tracking-wide">Paste email</TabsTrigger>
          <TabsTrigger value="pdf" className="font-display text-lg font-semibold uppercase tracking-wide">Upload PDF</TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <form onSubmit={submitEmail} className="mt-4 flex flex-col gap-3">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"From: …\nSubject: Load request…\n\nPaste the whole email, signatures and replies included."}
              className="sheet min-h-72 rounded-sm p-4 font-mono text-sm leading-relaxed"
            />
            <Button type="submit" disabled={busy || !text.trim()} className="self-start border border-foreground bg-hivis px-4 font-semibold text-hivis-foreground hover:bg-hivis/85">
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
                "flex min-h-56 cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed border-input bg-card p-6 text-center transition-colors focus-visible:border-foreground focus-visible:outline-none",
                dragging && "border-foreground bg-hivis/15",
              )}
            >
              <span className="doc-title text-3xl">{file ? "In the tray" : "In-tray"}</span>
              {file ? (
                <span className="font-mono text-sm">{file.name}</span>
              ) : (
                <span className="text-sm text-muted-foreground">Drop a PDF rate confirmation here, or click to choose one. 10 MB max.</span>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            <Button type="submit" disabled={busy || !file} className="self-start border border-foreground bg-hivis px-4 font-semibold text-hivis-foreground hover:bg-hivis/85">
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
          {result.loadId && (
            <Link href={`/loads/${result.loadId}`} className="text-sm underline">View this load</Link>
          )}
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
    </div>
  );
}
