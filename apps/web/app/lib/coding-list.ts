/**
 * H7 · p47 Coding List — 노드마다 승인 매크로 1개. 어느 노드에 어떤 매크로 개정이 붙었고(승인), 초안·반려·밀려난 것이 몇 개인지,
 * 마지막 BOM 스냅샷이 어느 개정으로 돌았는지 한 표로. 순수 함수(DB 를 모른다) — 읽기 전용 목록이다.
 * 노드당 승인이 2개 이상이면(있어서는 안 된다) 그대로 드러낸다 — 숨기지 않는다.
 */
export interface NodeLike { stableId: string; parentStable: string | null; kind: string; label: string; position: number }
export interface MacroLike { id: string; stableId: string; status: string; revision: number; dsl: string; approvedAt: Date | string | null; verifiedAtApproval: boolean }
export interface RunLike { stableId: string | null; macroRevision: number | null; createdAt: Date | string }
export interface CodingRow {
  stableId: string; label: string; kind: string; depth: number; path: string;
  approved: { id: string; revision: number; dsl: string; approvedAt: string | null; verified: boolean } | null;
  approvedCount: number; drafts: number; rejected: number; superseded: number;
  lastRun: { macroRevision: number | null; at: string; matchesApproved: boolean } | null;
}

const iso = (v: Date | string | null) => (v === null ? null : v instanceof Date ? v.toISOString() : v);

export function buildCodingList(nodes: NodeLike[], macros: MacroLike[], runs: RunLike[]): CodingRow[] {
  const byParent = new Map<string | null, NodeLike[]>();
  for (const n of nodes) byParent.set(n.parentStable, [...(byParent.get(n.parentStable) ?? []), n]);
  const ids = new Set(nodes.map((n) => n.stableId));
  const roots = nodes.filter((n) => n.parentStable === null || !ids.has(n.parentStable));
  const lastRun = new Map<string, RunLike>();
  for (const r of runs) {
    if (!r.stableId) continue;
    const cur = lastRun.get(r.stableId);
    if (!cur || Date.parse(String(iso(r.createdAt))) > Date.parse(String(iso(cur.createdAt)))) lastRun.set(r.stableId, r);
  }
  const out: CodingRow[] = [];
  const walk = (n: NodeLike, depth: number, path: string[]) => {
    const ms = macros.filter((m) => m.stableId === n.stableId);
    const appr = ms.filter((m) => m.status === "approved").sort((a, b) => b.revision - a.revision);
    const a = appr[0];
    const lr = lastRun.get(n.stableId);
    out.push({
      stableId: n.stableId, label: n.label, kind: n.kind, depth, path: [...path, n.label].join(" › "),
      approved: a ? { id: a.id, revision: a.revision, dsl: a.dsl, approvedAt: iso(a.approvedAt), verified: a.verifiedAtApproval } : null,
      approvedCount: appr.length,
      drafts: ms.filter((m) => m.status === "draft").length,
      rejected: ms.filter((m) => m.status === "rejected").length,
      superseded: ms.filter((m) => m.status === "superseded").length,
      lastRun: lr ? { macroRevision: lr.macroRevision, at: String(iso(lr.createdAt)), matchesApproved: !!a && lr.macroRevision === a.revision } : null,
    });
    for (const c of [...(byParent.get(n.stableId) ?? [])].sort((x, y) => x.position - y.position)) walk(c, depth + 1, [...path, n.label]);
  };
  for (const r of roots.sort((x, y) => x.position - y.position)) walk(r, 0, []);
  return out;
}
