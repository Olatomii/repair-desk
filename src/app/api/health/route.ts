import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return NextResponse.json({ ok: false, service: "repair-desk" }, { status: 503 });
  }
  return NextResponse.json({
    ok: true,
    service: "repair-desk",
    timestamp: new Date().toISOString(),
  });
}
