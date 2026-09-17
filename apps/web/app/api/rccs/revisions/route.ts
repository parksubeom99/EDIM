import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { assembleCode, type SlotValues } from "@/app/lib/rccs";
import { withTenant, listRevisions, saveRevision, revLabel } from "@edim/db";

/**
 * Tier B — assembled-code revisions per hierarchy node (EDIM.pdf p24, p12).
 * GET  ?node=<stableId>            → { current, revisions[] }
 * POST { node, slots, reason? }    → saves a NEW revision (append-only) after
 *                                    re-assembling server-side; invalid code
 *                                    (grammar diagnostics) is refused with 422.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function view(r: { id: string; revNo: number; code: string; slots: unknown; reason: string | null; createdAt: Date; createdBy: string }) {
  return { id: r.id, revNo: r.revNo, rev: revLabel(r.revNo), code: r.code, slots: r.slots as SlotValues, reason: r.reason, createdAt: r.createdAt.toISOString(), createdBy: r.createdBy };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const node = req.nextUrl.searchParams.get("node");
  if (!node || !UUID.test(node)) return NextResponse.json({ error: "node required" }, { status: 400 });
  const rows = await withTenant(session.tenantId, (tx) => listRevisions(tx, node));
  const revisions = rows.map(view);
  return NextResponse.json({ current: revisions[0] ?? null, revisions });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(session.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { node?: unknown; slots?: unknown; reason?: unknown };
  const node = typeof body.node === "string" ? body.node : "";
  if (!UUID.test(node)) return NextResponse.json({ error: "node required" }, { status: 400 });
  const slots = (body.slots && typeof body.slots === "object" ? body.slots : {}) as SlotValues;
  const assembled = assembleCode(slots);
  if (!assembled.ok) return NextResponse.json({ error: "invalid code", diagnostics: assembled.diagnostics }, { status: 422 });
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(slots)) if (typeof v === "string" && v) clean[k] = v;
  const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim().slice(0, 200) : null;
  const row = await withTenant(session.tenantId, (tx) =>
    saveRevision(tx, { stableId: node, code: assembled.code, slots: clean, reason, createdBy: session.userId }),
  );
  return NextResponse.json({ ok: true, revision: view(row) });
}
