import { NextResponse } from "next/server";

export async function PATCH() {
  // Approve / reject / edit fields — implemented in Task 5
  return NextResponse.json({ message: "coming soon" }, { status: 501 });
}
