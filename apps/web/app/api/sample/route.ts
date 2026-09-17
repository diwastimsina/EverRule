import { NextResponse } from "next/server";
import { sampleFiles } from "@/lib/sample";

export function GET() {
  return NextResponse.json({
    description: "AI procurement agent created an unauthorized $78,000 purchase order",
    impact_amount: 78000,
    files: sampleFiles(),
  });
}
