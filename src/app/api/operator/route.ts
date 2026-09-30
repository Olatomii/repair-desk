import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { readJson, rejectCrossOrigin } from "@/lib/request-validation";
import { administrationSchema } from "@/lib/validators/administration";
import { administer } from "@/lib/administration";
import { operationError } from "@/lib/operation-response";
export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (session.user.role !== "OPERATOR") return NextResponse.json({ error: "Operator access required." }, { status: 403 });
  const input = administrationSchema.safeParse(await readJson(request));
  if (!input.success) return NextResponse.json({ error: "Check all required fields and selections." }, { status: 400 });
  try { return NextResponse.json(await administer(session.user.id, input.data)); }
  catch (error) { return operationError(error); }
}
