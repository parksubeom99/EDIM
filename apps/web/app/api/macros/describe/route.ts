import { NextResponse, type NextRequest } from "next/server";
import { parse, describe } from "@edim/macro-dsl";
import { getServerSession } from "@/app/lib/session";
import { SAMPLE_GLOSSARY } from "@/app/lib/macro/provider";
import { loadMacroTables } from "@/app/lib/catalog";

/**
 * STEP 5 역번역 (p27 Macro → Description · Flowchart). Deterministic: parse + describe,
 * no LLM. A macro that does not parse returns the parse error instead of a guess.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { dsl?: unknown; product?: unknown };
  if (typeof body.dsl !== "string" || !body.dsl.trim()) return NextResponse.json({ error: "dsl required" }, { status: 400 });
  const parsed = parse(body.dsl);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error.message, position: parsed.error.position ?? null });
  const reg = await loadMacroTables(session.tenantId, typeof body.product === "string" ? body.product : "EU");
  const glossary = { ...SAMPLE_GLOSSARY, tables: reg?.labels ?? SAMPLE_GLOSSARY.tables };
  return NextResponse.json({ ok: true, tablesFrom: reg ? "registered" : "sample", ...describe(parsed.value, glossary) });
}
