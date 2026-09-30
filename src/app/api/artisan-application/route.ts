import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { readJson, rejectCrossOrigin } from "@/lib/request-validation";
import { applicationSchema } from "@/lib/validators/administration";
import { applyAsArtisan } from "@/lib/administration";
import { operationError } from "@/lib/operation-response";
export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const input = applicationSchema.safeParse(await readJson(request));
  if (!input.success) return NextResponse.json({ error: "Provide a phone number, at least 20 characters about your experience, and your cities and services." }, { status: 400 });
  try { return NextResponse.json(await applyAsArtisan(session.user.id, input.data)); }
  catch (error) { return operationError(error); }
}
