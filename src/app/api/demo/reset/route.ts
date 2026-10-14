import { NextResponse } from "next/server";

export async function POST() {
  // Demo reset — implemented in Task 8
  return NextResponse.json({ message: "coming soon" }, { status: 501 });
}
