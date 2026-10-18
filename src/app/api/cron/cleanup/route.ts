import { NextResponse } from "next/server";
import { deleteExpiredSandboxes } from "@/lib/demo";

// Room to delete a day's worth of sandboxes
export const maxDuration = 60;

// Called daily by Vercel Cron (vercel.json). Vercel sends CRON_SECRET as a bearer token.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const deleted = await deleteExpiredSandboxes();
    return NextResponse.json({ deleted });
  } catch (err) {
    console.error("Sandbox cleanup failed:", err);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
