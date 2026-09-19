import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "repair-desk",
    timestamp: new Date().toISOString(),
  });
}
