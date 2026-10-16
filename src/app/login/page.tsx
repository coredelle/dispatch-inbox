"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
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
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold">Sign in</h1>
      {state === "sent" ? (
        <p className="mt-4 text-muted-foreground">Check your email for a sign-in link.</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex w-full max-w-sm flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring"
          />
          <Button type="submit" disabled={state === "sending"}>
            {state === "sending" ? "Sending…" : "Email me a sign-in link"}
          </Button>
          {state === "error" && (
            <p className="text-sm text-destructive">Couldn&apos;t send the link. Try again in a minute.</p>
          )}
        </form>
      )}
    </main>
  );
}
