"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { PartInfo } from "@/app/lib/part-info";

/**
 * ccmd K · KC-4 · p28 · p38 "Double Click (부품의 정보 관리)" — 조립도 옆 Item 표(Item · Description · Q'ty · Remarks info).
 * 줄(또는 도면의 풍선번호)을 더블클릭하면 그 부품의 정보가 표 아래 인라인 패널로 뜬다. 값은 전부 **BOM 스냅샷 기준**(단가를 나중에 바꿔도 그대로).
 */
const cell: CSSProperties = { border: "1px solid var(--line)", padding: "3px 6px", fontSize: 12, textAlign: "left", verticalAlign: "top" };
const won = (n: number) => `₩${Math.round(n).toLocaleString("ko-KR")}`;

export function PartInfoPanel({ runId, selected, onSelect }: { runId: string; selected: number | null; onSelect: (no: number) => void }) {
  const [items, setItems] = useState<PartInfo[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setItems(null); setErr(null);
    fetch(`/api/bom-runs/${runId}/parts`).then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (!live) return;
      if (!r.ok) { setErr(r.status === 403 ? "부품 정보는 편집 역할만 봅니다(단가가 들어 있습니다)" : (j.error ?? `불러오기 실패 (${r.status})`)); return; }
      setItems(j.items ?? []);
    }).catch(() => live && setErr("불러오기 실패"));
    return () => { live = false; };
  }, [runId]);
  const it = items?.find((x) => x.no === selected) ?? null;
  return (
    <aside data-testid="part-panel" data-ready={items ? "1" : err ? "err" : "0"} style={{ overflow: "auto", borderLeft: "1px solid var(--line)", padding: 8, background: "var(--surface-0)", display: "grid", gap: 8, alignContent: "start" }}>
      <b style={{ fontSize: 13 }}>Item 표 · 부품 정보 <span style={{ fontWeight: 400, color: "var(--ink-muted)", fontSize: 11 }}>줄 또는 풍선번호를 더블클릭</span></b>
      {err && <p data-testid="part-panel-error" style={{ color: "var(--warn)", fontSize: 12, margin: 0 }}>{err}</p>}
      {items && (
        <table data-testid="part-table" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr>{["Item", "Description", "Q'ty", "Remarks info"].map((h) => <th key={h} style={{ ...cell, background: "var(--surface-2)" }}>{h}</th>)}</tr></thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.no} data-testid={`part-row-${x.no}`} data-code={x.code} onDoubleClick={() => onSelect(x.no)} title="더블클릭 — 부품의 정보"
                style={{ cursor: "pointer", background: x.no === selected ? "var(--accent-soft, #e6f2ef)" : undefined }}>
                <td style={cell}>{x.no}</td>
                <td style={cell}>{x.fromSpecial && x.spec ? x.spec : x.part}</td>
                <td style={{ ...cell, textAlign: "right" }}>{x.qty} {x.unit}</td>
                <td data-testid={`part-remarks-${x.no}`} style={{ ...cell, fontSize: 11 }}>{x.remarksInfo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {it && (
        <section data-testid="part-info" data-no={it.no} data-code={it.code} data-qty={it.qty} data-supplier={it.supplier ?? ""} data-unit-cost={it.unitCost}
          data-price-id={it.priceSource.row?.id ?? ""} data-order={it.assembly.order}
          style={{ border: "1px solid var(--accent)", borderRadius: 4, padding: 8, fontSize: 12, display: "grid", gap: 4 }}>
          <b>#{it.no} · <span style={{ fontFamily: "monospace" }}>{it.code}</span> <span style={{ fontWeight: 400, color: "var(--ink-muted)" }}>({it.resolvedCode})</span></b>
          <div>{it.part} — {it.spec || "사양 없음"}</div>
          <div>수량 {it.qty} {it.unit} · 구획 {it.section} · 단가 {won(it.unitCost)} (스냅샷)</div>
          <div>공급처: {it.supplier ?? "—(구매 품목 아님 또는 미등록)"}</div>
          <div data-testid="part-price-source">단가 출처: {it.priceSource.label}{it.priceSource.row ? ` — 행 ${it.priceSource.row.id.slice(0, 8)} · ${won(it.priceSource.row.price)} · ${it.priceSource.row.effectiveFrom}${it.priceSource.row.supplier ? ` · ${it.priceSource.row.supplier}` : ""}` : ""}</div>
          <div>첨부 DWG(Sub Item DWG): {it.dwg.length ? it.dwg.map((d) => <a key={d.id} href={`/api/attachments/${d.id}/file`} style={{ marginRight: 6, color: "var(--accent)" }}>{d.name} <small>{d.kind === "dwg3d" ? "3D" : "2D"}</small></a>) : "없음"}</div>
          <div data-testid="part-assembly">조립순서: {it.assembly.order === 0 ? `먼저(구획 밖 · ${it.assembly.section})` : `${it.assembly.order} / ${it.assembly.of} (${it.assembly.section})`} — 분해도 순서 = 구획 순서</div>
          <div>세부 치수: {it.details.length ? it.details.map((d) => `${d.target}.${d.label}=${d.value}`).join(" · ") : "없음"}</div>
          <div>주의사항: {it.notes.length ? <ol style={{ margin: "2px 0 0", paddingLeft: 18 }}>{it.notes.map((n, i) => <li key={i}>{n}</li>)}</ol> : "없음"}</div>
          <small style={{ color: "var(--ink-muted)" }}>이 정보는 BOM 스냅샷 {runId.slice(0, 8)} 기준입니다 — 단가 · 공급처를 나중에 바꿔도 그대로입니다.</small>
        </section>
      )}
    </aside>
  );
}
