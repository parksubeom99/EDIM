"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * P4-b — Purchasing (p51 [Set-Up / User ERP / Material / Purchase]).
 * 구매 요청은 MainForm 의 Document 탭에서 **BOM 스냅샷으로부터** 만들어진다. 여기서는
 * 그 목록을 보고, Process(작성중 → 견적 요청 → 발주)를 올리고, CSV 로 내보낸다.
 * 발주되면 PO 번호가 붙고 잠긴다(DB 트리거).
 */
interface PrLine { lineNo: number; resolvedCode: string; part: string; spec: string; qty: number; unit: string; unitPrice: number; supplier: string | null; requiredDate: string | null }
interface Pr { id: string; prNo: string; poNo: string | null; projectNo: string | null; code: string; status: string; bomRunId: string; lines: PrLine[] }

interface Trace {
  snapshot: { id: string; code: string; catalogFp: string; total: number | null; lines: number };
  codeRevision: { rev: number; code: string } | null;
  macro: { revision: number } | null;
  approvals: { tier: string; state: string }[];
  approved: boolean;
  drawings: { drawingNo: string; rev: string; status: string }[];
  documents: { docNo: string; rev: string; status: string }[];
}
const revLetter = (n: number) => String.fromCharCode(64 + Math.min(Math.max(n, 1), 26));

const LABEL: Record<string, string> = { draft: "작성중", rfq: "견적 요청", ordered: "발주" };
const NEXT: Record<string, string> = { draft: "rfq", rfq: "ordered" };
const th = { textAlign: "left" as const, padding: "5px 6px", color: "var(--ink-muted)", fontWeight: 500, borderBottom: "1px solid var(--line)" };
const td = { padding: "5px 6px", borderBottom: "1px solid var(--line)", verticalAlign: "top" as const };

export function Purchasing({ canEdit }: { canEdit: boolean }) {
  const [rows, setRows] = useState<Pr[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [trace, setTrace] = useState<Record<string, Trace | null>>({});
  async function toggleTrace(pr: Pr) {
    if (trace[pr.id]) return setTrace((t) => ({ ...t, [pr.id]: null }));
    const j = (await fetch(`/api/trace?runId=${pr.bomRunId}`).then((r) => r.json()).catch(() => null)) as Trace | null;
    setTrace((t) => ({ ...t, [pr.id]: j }));
  }
  const load = useCallback(async () => {
    const j = (await fetch("/api/purchase-requests").then((r) => r.json()).catch(() => ({}))) as { rows?: Pr[] };
    setRows(j.rows ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function advance(id: string, status: string) {
    setErr(null);
    const r = await fetch(`/api/purchase-requests/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    if (!r.ok) setErr(j.error ?? "Process 변경 실패");
    await load();
  }

  return (
    <section data-testid="purchasing" style={{ marginTop: 12 }}>
      <p style={{ color: "var(--ink-muted)", fontSize: "var(--fs-13)" }}>
        구매 요청은 MainForm ▸ Document 탭에서 BOM 스냅샷으로 만듭니다. 줄은 그 스냅샷에서 <b>구매 품목</b>으로 등록돼 있던 것만 들어옵니다.
      </p>
      {err && <p data-testid="purchasing-error" style={{ color: "var(--warn)", fontSize: "var(--fs-13)" }}>{err}</p>}
      {rows.length === 0 && <p data-testid="purchasing-empty" style={{ color: "var(--ink-muted)" }}>구매 요청이 없습니다.</p>}
      {rows.map((pr) => (
        <div key={pr.id} data-testid="pr-card" data-status={pr.status} style={{ border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 12, marginTop: 12, background: "var(--surface-2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: "var(--fs-13)" }}>
            <span data-testid="pr-no" style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: "var(--fs-14)" }}>{pr.prNo}</span>
            <span data-testid="pr-status">{LABEL[pr.status] ?? pr.status}</span>
            {pr.poNo && <span data-testid="pr-po" style={{ fontFamily: "var(--font-mono)" }}>PO No : {pr.poNo}</span>}
            <span style={{ color: "var(--ink-muted)" }}>Project No. {pr.projectNo ?? "—"} · BOM No. <span style={{ fontFamily: "var(--font-mono)" }}>{pr.bomRunId.slice(0, 8)}</span> · {pr.code}</span>
            <span style={{ marginLeft: "auto", display: "inline-flex", gap: 8 }}>
              {canEdit && NEXT[pr.status] && (
                <button type="button" data-testid={`pr-advance-${pr.prNo}`} onClick={() => void advance(pr.id, NEXT[pr.status]!)}
                  style={{ fontSize: "var(--fs-12)", padding: "4px 10px", background: "var(--surface-1)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)" }}>
                  → {LABEL[NEXT[pr.status]!]}
                </button>
              )}
              <button type="button" data-testid={`pr-trace-${pr.prNo}`} onClick={() => void toggleTrace(pr)}
                style={{ fontSize: "var(--fs-12)", padding: "4px 10px", background: "transparent", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)" }}>
                추적
              </button>
              <a data-testid={`pr-export-${pr.prNo}`} href={`/api/purchase-requests/${pr.id}/export`}
                style={{ fontSize: "var(--fs-12)", padding: "4px 10px", background: "var(--accent)", color: "var(--accent-contrast)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", textDecoration: "none" }}>
                Export CSV
              </a>
            </span>
          </div>
          {trace[pr.id] && (() => { const t = trace[pr.id]!; return (
            <div data-testid="pr-trace" data-approved={t.approved ? "1" : "0"} style={{ marginTop: 8, padding: "8px 10px", border: "1px dashed var(--line)", borderRadius: "var(--radius-sm)", fontSize: "var(--fs-12)", lineHeight: 1.7 }}>
              <b>이 구매 요청은 어디서 왔나</b> — 거꾸로 따라갑니다 (전부 저장된 값)<br />
              {pr.prNo} ← BOM 스냅샷 <span style={{ fontFamily: "var(--font-mono)" }}>{t.snapshot.id.slice(0, 8)}</span> ({t.snapshot.code} · {t.snapshot.lines}줄 · 원가 {t.snapshot.total?.toLocaleString("ko-KR") ?? "—"})
              {" "}← 코드 개정 <b>{t.codeRevision ? `Rev ${revLetter(t.codeRevision.rev)} (${t.codeRevision.code})` : "없음 — 저장하지 않은 조합으로 실행"}</b>
              {" "}← 카탈로그 지문 <span style={{ fontFamily: "var(--font-mono)" }}>{t.snapshot.catalogFp}</span>
              {" "}← 승인 매크로 <b>{t.macro ? `r${t.macro.revision}` : "없음"}</b><br />
              승인: <b style={{ color: t.approved ? "var(--accent)" : "var(--warn)" }}>{t.approved ? "승인된 BOM" : "아직 승인되지 않은 BOM — 발주할 수 없습니다"}</b>
              {t.approvals.length > 0 && <> ({t.approvals.map((a) => `${a.tier}:${a.state}`).join(" · ")})</>}
              {" · "}같은 BOM 에서 나온 것: 도면 {t.drawings.map((d) => `${d.drawingNo} Rev ${d.rev}`).join(", ") || "없음"} / 문서 {t.documents.map((d) => `${d.docNo} Rev ${d.rev}`).join(", ") || "없음"}
            </div>
          ); })()}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8, fontSize: "var(--fs-12)" }}>
              <thead><tr><th style={th}>Item</th><th style={th}>Code</th><th style={th}>Part · Spec</th><th style={{ ...th, textAlign: "right" }}>Qty</th><th style={th}>Supplier</th><th style={th}>Required date</th><th style={{ ...th, textAlign: "right" }}>Price</th></tr></thead>
              <tbody>
                {pr.lines.map((l) => (
                  <tr key={l.lineNo} data-testid="pr-line">
                    <td style={td}>{l.lineNo}</td>
                    <td style={{ ...td, fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{l.resolvedCode}</td>
                    <td style={td}>{l.part}<br /><span style={{ color: "var(--ink-muted)" }}>{l.spec}</span></td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>{l.qty} {l.unit}</td>
                    <td style={td}>{l.supplier ?? "—"}</td>
                    <td style={td}>{l.requiredDate ? l.requiredDate.slice(0, 10) : "—"}</td>
                    <td style={{ ...td, textAlign: "right", fontFamily: "var(--font-mono)" }}>{l.unitPrice.toLocaleString("ko-KR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  );
}
