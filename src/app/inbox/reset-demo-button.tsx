"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ResetDemoButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "resetting" | "error">("idle");

  async function reset() {
    setState("resetting");
    const res = await fetch("/api/demo/reset", { method: "POST" }).catch(() => null);
    if (!res?.ok) {
      setState("error");
      return;
    }
    setState("idle");
    router.refresh();
  }

  return (
    <Button size="sm" variant="outline" disabled={state === "resetting"} onClick={reset}>
      {state === "resetting" ? "Resetting…" : state === "error" ? "Reset failed, try again" : "Reset demo"}
    </Button>
  );
}
