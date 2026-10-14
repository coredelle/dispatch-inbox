import { NextResponse } from "next/server";

export async function POST() {
  // Extraction route — implemented in Task 3
  return NextResponse.json({ message: "coming soon" }, { status: 501 });
}
