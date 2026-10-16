"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export function LoginForm({ notice }: { notice: string | null }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/inbox` },
    });
    setState(error ? "error" : "sent");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="sheet w-full max-w-sm p-6">
          <span className="eyebrow">Sign-in slip</span>
          <h1 className="doc-title mt-1 border-b-2 border-foreground pb-2 text-4xl">Sign in</h1>
          {notice && <p className="mt-3 text-sm text-destructive">{notice}</p>}
          {state === "sent" ? (
            <p className="mt-4">Check your email for a sign-in link. Open it in this browser.</p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="eyebrow">Email</span>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="field-input"
                />
              </label>
              <Button
                type="submit"
                disabled={state === "sending"}
                className="border border-foreground bg-hivis font-semibold text-hivis-foreground hover:bg-hivis/85"
              >
                {state === "sending" ? "Sending…" : "Email me a sign-in link"}
              </Button>
              {state === "error" && (
                <p className="text-sm text-destructive">Couldn&apos;t send the link. Try again in a minute.</p>
              )}
            </form>
          )}
          <p className="perforated mt-5 pt-3 text-sm text-muted-foreground">
            Just looking? Use <span className="font-medium text-foreground">Try the demo</span> on the home page. No signup needed.
          </p>
        </div>
      </main>
    </div>
  );
}
