"use client";

import type { CSSProperties } from "react";
import { CodeChip } from "@edim/ui";
import type { RunResult } from "./action-bar";
import type { BomLine, EbomGroup, CostSummary } from "@/app/lib/output/bom";
import { priceSourceLabel, type PriceSource } from "@/app/lib/price";

const card: CSSProperties = { background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 14 };
const h: CSSProperties = { fontFamily: "var(--font-display)", fontSize: "var(--fs-14)", fontWeight: 600, margin: "0 0 8px" };
const muted: CSSProperties = { color: "var(--ink-muted)", fontSize: "var(--fs-12)" };
const th: CSSProperties = { padding: "6px 6px", borderBottom: "1px solid var(--line)", textAlign: "left", color: "var(--ink-muted)", fontWeight: 600, fontSize: "var(--fs-12)" };
const td: CSSProperties = { padding: "6px 6px", borderBottom: "1px solid var(--line)", fontSize: "var(--fs-13)" };
const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;

export function BomPanel({ code, runs }: { code: string; runs: RunResult[] }) {
  const bom = runs.find((r) => r.kind === "bom" && r.status === "ran") as (RunResult & { lines?: BomLine[] }) | undefined;
  const ebom = runs.find((r) => r.kind === "ebom" && r.status === "ran") as (RunResult & { groups?: EbomGroup[] }) | undefined;
  const cost = runs.find((r) => r.kind === "cost" && r.status === "ran") as (RunResult & { cost?: CostSummary }) | undefined;
  const lines = (bom?.lines ?? []) as (BomLine & { priceSource?: PriceSource })[];

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div data-testid="bom-panel" style={card}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
          <div style={h}>BOM · Item BOM</div>
          <span style={muted}>코드 <CodeChip code={code || "—"} /> · Action Bar → BOM Run</span>
          {bom && <span style={{ ...muted, marginLeft: "auto" }}>{bom.at.slice(11, 19)} · {lines.length}행</span>}
        </div>
        {lines.length === 0 ? (
          <p style={{ ...muted, margin: 0 }}>아직 실행 결과 없음</p>
        ) : (
          <table data-testid="bom-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>#</th><th style={th}>Code</th><th style={th}>Section</th><th style={th}>Part</th><th style={th}>Spec</th><th style={{ ...th, textAlign: "right" }}>Qty</th><th style={th}>Mat.</th><th style={{ ...th, textAlign: "right" }}>Unit ₩</th><th style={th}>단가 출처</th><th style={{ ...th, textAlign: "right" }}>Amount ₩</th></tr></thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.no} data-bom-row={l.no}>
                  <td style={{ ...td, fontFamily: "var(--font-mono)", color: "var(--ink-muted)" }}>{l.no}</td>
                  <td data-bom-code={l.no} style={{ ...td, fontFamily: "var(--font-mono)", fontSize: "var(--fs-12)", color: "var(--accent)", whiteSpace: "nowrap" }}>{bom?.trace?.find((t) => t.no === l.no)?.resolvedCode ?? "—"}</td>
                  <td style={td}>{l.section}</td><td style={td}>{l.part}</td>
                  <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: "var(--fs-12)" }}>{l.spec}</td>
                  <td style={{ ...td, textAlign: "right", fontFamily: "var(--font-mono)" }}>{l.qty} {l.unit}</td>
                  <td style={td}>{l.material}</td>
                  <td style={{ ...td, textAlign: "right", fontFamily: "var(--font-mono)" }}>{l.unitCost.toLocaleString("ko-KR")}</td>
                  <td data-price-src={l.priceSource?.kind ?? ""} style={{ ...td, fontSize: "var(--fs-12)", whiteSpace: "nowrap", color: l.priceSource?.kind === "history" ? "var(--accent)" : l.priceSource?.kind === "currency-mismatch" ? "var(--warn)" : "var(--ink-muted)" }}>{priceSourceLabel(l.priceSource) || "—"}</td>
                  <td style={{ ...td, textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{(l.qty * l.unitCost).toLocaleString("ko-KR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 12 }}>
        <div data-testid="ebom-panel" style={card}>
          <div style={h}>EBOM · 섹션별</div>
          {!ebom?.groups ? <p style={{ ...muted, margin: 0 }}>EBOM Run 결과 없음</p> : (
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
              {ebom.groups.map((g) => (
                <li key={g.section} data-ebom-section={g.section} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--line)", fontSize: "var(--fs-13)" }}>
                  <span><b>{g.section}</b> <span style={muted}>· {g.items.length}품목</span></span>
                  <span style={{ fontFamily: "var(--font-mono)" }}>{won(g.subtotal)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div data-testid="cost-panel" style={{ ...card, background: cost ? "color-mix(in srgb, var(--accent) 6%, var(--surface-2))" : "var(--surface-2)" }}>
          <div style={h}>Cost · 원가</div>
          {!cost?.cost ? <p style={{ ...muted, margin: 0 }}>Cost 결과 없음</p> : (
            <dl style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "4px 12px", margin: 0, fontSize: "var(--fs-13)" }}>
              <dt style={muted}>자재비</dt><dd style={{ margin: 0, fontFamily: "var(--font-mono)", textAlign: "right" }}>{won(cost.cost.material)}</dd>
              <dt style={muted}>가공·조립 (18%)</dt><dd style={{ margin: 0, fontFamily: "var(--font-mono)", textAlign: "right" }}>{won(cost.cost.labor)}</dd>
              <dt style={muted}>간접비 (12%)</dt><dd style={{ margin: 0, fontFamily: "var(--font-mono)", textAlign: "right" }}>{won(cost.cost.overhead)}</dd>
              <dt style={{ fontWeight: 700, borderTop: "1px solid var(--line)", paddingTop: 6 }}>합계</dt>
              <dd data-testid="cost-total" style={{ margin: 0, fontFamily: "var(--font-mono)", textAlign: "right", fontWeight: 700, color: "var(--accent)", fontSize: "var(--fs-16)", borderTop: "1px solid var(--line)", paddingTop: 6 }}>{won(cost.cost.total)}</dd>
            </dl>
          )}
          <p style={{ ...muted, margin: "8px 0 0" }}>단가 = BOM Run 순간의 현재 단가 이력(Set-Up ▸ 자재·구매품 · p67), 없으면 코드 관계값(샘플). 스냅샷 값을 보여 줄 뿐 다시 계산하지 않는다. 아직 없음: 통화 환산 · 관계 배율(재질)의 이력 단가 적용.</p>
        </div>
      </div>
    </div>
  );
}
