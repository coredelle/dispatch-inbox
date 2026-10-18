import { readFile } from "node:fs/promises";
import path from "node:path";
import { SAMPLES } from "@/lib/samples";

// Serves the fictional sample documents; only ids on the list are readable
export async function GET(_request: Request, ctx: RouteContext<"/samples/[id]">) {
  const { id } = await ctx.params;
  const sample = SAMPLES.find((s) => s.id === id);
  if (!sample) return new Response("Not found", { status: 404 });

  const bytes = await readFile(path.join(process.cwd(), "sample-data", sample.file));
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": sample.kind === "pdf" ? "application/pdf" : "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
