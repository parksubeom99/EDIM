"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { CodeChip } from "@edim/ui";
import type { SlotDef, SlotValues, AssembleResult } from "@/app/lib/rccs";
import type { WorkTab, CanvasCmd } from "./toolbar";
import type { WorkbenchProject } from "./mainform-shell";
import type { RunResult } from "./action-bar";
import { MacroPanel } from "./macro-panel";
import { BomPanel } from "./bom-panel";
import { SpecInput } from "./spec-input";

const card: CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius)",
  padding: 14,
};
const h: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "var(--fs-14)",
  fontWeight: 600,
  margin: "0 0 8px",
};
const muted: CSSProperties = { color: "var(--ink-muted)", fontSize: "var(--fs-12)" };

export function WorkPlace({
  tab,
  project,
  slots,
  onSlots,
  assembled,
  slotDefs,
  runs,
  nodeStable,
  canEdit,
  canDecide,
  rev,
  onRev,
  canvas,
}: {
  tab: WorkTab;
  project: WorkbenchProject | null;
  slots: SlotValues;
  onSlots: (s: SlotValues) => void;
  assembled: AssembleResult;
  slotDefs: readonly SlotDef[];
  runs: RunResult[];
  nodeStable: string | null;
  canEdit: boolean;
  canDecide: boolean;
  rev: RevInfo | null;
  onRev: (r: RevInfo | null) => void;
  canvas?: CanvasLink;
}) {
  return (
    <div style={{ display: "grid", gridTemplateRows: "1fr auto", minHeight: 0, height: "100%" }}>
      {/* Main Work Place */}
      <div style={{ overflow: "auto", padding: 16 }}>
        {!project && (
          <div style={{ ...card, marginBottom: 12, borderStyle: "dashed" }}>
            <div style={h}>프로젝트를 선택하세요</div>
            <p style={{ ...muted, margin: 0 }}>
              좌측 Work Hierarchy에서 프로젝트 노드를 클릭하면 Inspector·승인·Action Bar가 그 프로젝트에 바인딩됩니다.
              Code Builder는 프로젝트 없이도 동작합니다.
            </p>
          </div>
        )}
        {tab === "code" && <CodeBuilder slotDefs={slotDefs} slots={slots} onSlots={onSlots} assembled={assembled} nodeStable={nodeStable} canEdit={canEdit} rev={rev} onRev={onRev} />}
        {tab === "code" && <SpecInput product={slots.A ?? ""} slots={slots} onSlots={onSlots} card={card} h={h} muted={muted} />}
        {tab === "design" && <DesignCanvas code={assembled.code} slots={slots} runs={runs} nodeStable={nodeStable} canEdit={canEdit} link={canvas} />}
        {tab === "bom" && <BomPanel code={assembled.code} runs={runs} />}
        {tab === "macro" && <MacroPanel project={project} nodeStable={nodeStable} canEdit={canEdit} canDecide={canDecide} runs={runs} />}
        {tab === "document" && <DocumentPanel project={project} code={assembled.code} runs={runs} nodeStable={nodeStable} canEdit={canEdit} />}
      </div>

      {/* Sub / Key Work Place */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          borderTop: "1px solid var(--line)",
          background: "var(--surface-1)",
          minHeight: 96,
        }}
      >
        <div data-testid="sub-workplace" style={{ padding: "8px 12px", borderRight: "1px solid var(--line)" }}>
          <div style={{ ...muted, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 4 }}>Sub Work Place</div>
          <div style={{ fontSize: "var(--fs-13)" }}>
            현재 코드 <CodeChip code={assembled.code || "—"} />
            <span style={{ ...muted, marginLeft: 8 }}>
              {assembled.ok ? "규칙 검증 통과" : `${assembled.diagnostics.filter((d) => d.severity === "error").length}건 오류`}
            </span>
          </div>
        </div>
        <div data-testid="key-workplace" style={{ padding: "8px 12px" }}>
          <div style={{ ...muted, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 4 }}>Key Work Place · 핵심 치수</div>
          <KeyDims slots={slots} runs={runs} />
        </div>
      </div>
    </div>
  );
}

/* ───────────── Code Builder (A~F) ───────────── */
export interface RevInfo { revNo: number; rev: string; code: string }
interface RevRow extends RevInfo { id: string; reason: string | null; createdAt: string }

function CodeBuilder({
  slotDefs,
  slots,
  onSlots,
  assembled,
  nodeStable,
  canEdit,
  rev,
  onRev,
}: {
  slotDefs: readonly SlotDef[];
  slots: SlotValues;
  onSlots: (s: SlotValues) => void;
  assembled: AssembleResult;
  nodeStable: string | null;
  canEdit: boolean;
  rev: RevInfo | null;
  onRev: (r: RevInfo | null) => void;
}) {
  /* Tier B — revision history of this node (EDIM.pdf p24). Append-only on the server. */
  const [revs, setRevs] = useState<RevRow[]>([]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!nodeStable) { setRevs([]); return; }
    fetch(`/api/rccs/revisions?node=${nodeStable}`).then((r) => r.json()).then((j) => setRevs(j.revisions ?? [])).catch(() => setRevs([]));
  }, [nodeStable]);
  async function save() {
    if (!nodeStable) return;
    setBusy(true); setMsg(null);
    const r = await fetch("/api/rccs/revisions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ node: nodeStable, slots, reason }) });
    const j = await r.json();
    setBusy(false);
    if (j.ok) { setRevs((xs) => [j.revision, ...xs]); onRev({ revNo: j.revision.revNo, rev: j.revision.rev, code: j.revision.code }); setReason(""); setMsg(`저장 · Rev ${j.revision.rev}`); }
    else setMsg(`거부: ${j.error ?? r.status}`);
  }
  const dirty = !rev || rev.code !== assembled.code;
  return (
    <div data-testid="code-builder" style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={h}>Code Builder · RCCS™ 조립</div>
        <span style={muted}>SubCode → ProductCode → Relationship → Arrangement (p61) · 선택지 = <a href="/setup" style={{ color: "var(--accent)" }}>Set-Up ▸ Sub Code</a> 등록값</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {slotDefs.map((s) => {
          const err = assembled.diagnostics.find((d) => d.slot === s.key);
          return (
            <label key={s.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", marginRight: 6 }}>{s.key}</span>
                {s.name} {s.required && <span style={{ color: "var(--warn)" }}>*</span>}
              </span>
              <select
                data-slot={s.key}
                value={slots[s.key] ?? ""}
                onChange={(e) => onSlots({ ...slots, [s.key]: e.target.value })}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--fs-13)",
                  padding: "6px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${err?.severity === "error" ? "var(--warn)" : "var(--line)"}`,
                  background: "var(--surface-0)",
                  color: "var(--ink)",
                }}
              >
                {s.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: 11, color: err ? "var(--warn)" : "var(--ink-muted)" }}>
                {err ? err.message : s.hint}
              </span>
            </label>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 14,
          padding: 12,
          borderRadius: "var(--radius-sm)",
          background: "var(--surface-1)",
          border: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={muted}>조립 결과</span>
        <span data-testid="assembled-code" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-20)", color: "var(--accent)" }}>
          {assembled.code || "—"}
        </span>
        <span
          data-testid="assembled-status"
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--fs-12)",
            color: assembled.ok ? "var(--accent)" : "var(--warn)",
          }}
        >
          {assembled.ok ? "VALID" : "INVALID"}
        </span>
      </div>
      {/* Tier B: persist the assembled code as a new revision (A, B, C…) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
        <input
          data-testid="rev-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={nodeStable ? "개정 사유 (rev_reason, p24)" : "프로젝트 노드를 선택하면 저장할 수 있습니다"}
          disabled={!nodeStable || !canEdit}
          style={{ flex: 1, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", background: "var(--surface-1)", color: "var(--ink)", fontSize: "var(--fs-12)" }}
        />
        {canEdit && (
          <button
            type="button"
            data-testid="rev-save"
            disabled={busy || !nodeStable || !assembled.ok || !dirty}
            onClick={save}
            style={{ padding: "6px 12px", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", background: assembled.ok && dirty ? "var(--accent)" : "var(--surface-2)", color: assembled.ok && dirty ? "var(--accent-contrast)" : "var(--ink-muted)", fontSize: "var(--fs-12)", cursor: "pointer" }}
          >
            {busy ? "…" : dirty ? `Save · Rev ${nextRevLabel(revs.length)}` : `Saved · Rev ${rev?.rev}`}
          </button>
        )}
        {msg && <span style={muted}>{msg}</span>}
      </div>
      {revs.length > 0 && (
        <div data-testid="rev-list" style={{ marginTop: 10, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
          <span style={muted}>REVISIONS · 이 노드의 코드 개정 이력 (append-only)</span>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 4, fontSize: "var(--fs-12)" }}>
            <tbody>
              {revs.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: "4px 6px", fontFamily: "var(--font-mono)", color: r.revNo === rev?.revNo ? "var(--accent)" : "var(--ink-muted)", width: 56 }}>Rev {r.rev}</td>
                  <td style={{ padding: "4px 6px", fontFamily: "var(--font-mono)" }}>{r.code}</td>
                  <td style={{ padding: "4px 6px", color: "var(--ink-muted)" }}>{r.reason ?? "—"}</td>
                  <td style={{ padding: "4px 6px", color: "var(--ink-muted)", whiteSpace: "nowrap" }}>{r.createdAt.slice(0, 16).replace("T", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {assembled.diagnostics.length > 0 && (
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: "var(--fs-12)" }}>
          {assembled.diagnostics.map((d, i) => (
            <li key={i} style={{ color: d.severity === "error" ? "var(--warn)" : "var(--ink-muted)" }}>
              [{d.severity}] {d.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function nextRevLabel(count: number): string {
  let s = "", x = count + 1;
  while (x > 0) { s = String.fromCharCode(65 + ((x - 1) % 26)) + s; x = Math.floor((x - 1) / 26); }
  return s;
}

/* ───────────── Arrangement (p13·35·36·46·58) ───────────── */
/** 청사진 p36 Fan Direction — 좌/우 × 0·90·180·270 */
const DIRS = ["L0", "L90", "L180", "L270", "R0", "R90", "R180", "R270"] as const;
interface ArrComp { code: string; at: string; level: string }
interface ArrSection { name: string; len: number | null; dir: string | null; when: boolean; active: boolean; locked: boolean; components?: ArrComp[]; children?: string[] }
/** p36 Component 배치 — 구획 안 3×3 칸 */
const ATS: [string, string][] = [["front", "앞"], ["center", "중"], ["rear", "뒤"]];
const LVS: [string, string][] = [["top", "상"], ["mid", "중"], ["bottom", "하"]];
const arrTh: CSSProperties = { textAlign: "left", fontWeight: 600, padding: "2px 8px 4px 0", borderBottom: "1px solid var(--line)" };
const arrTd: CSSProperties = { padding: "3px 8px 3px 0", borderBottom: "1px solid var(--line)", verticalAlign: "middle" };
const arrMini = (off: boolean): CSSProperties => ({
  fontFamily: "var(--font-mono)", fontSize: 11, color: off ? "var(--line)" : "var(--ink-muted)",
  background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 4,
  padding: "1px 6px", marginRight: 4, cursor: off ? "default" : "pointer",
});

/** p58 툴바 ↔ Design 개념도. 선택·이동 상태는 셸이 들고(툴바가 버튼을 잠그려고 본다), 편집은 여기 초안에서만 한다. */
export interface CanvasLink {
  cmd: { cmd: CanvasCmd; seq: number } | null;
  done: () => void;
  sel: string | null;
  onSel: (s: string | null) => void;
  moving: boolean;
  onMoving: (m: boolean) => void;
}

/** Copy 이름: 같은 이름이 없을 때까지 -2, -3 … (API 상한 24자). */
function copyName(base: string, taken: Set<string>): string {
  for (let n = 2; n < 100; n++) {
    const suf = `-${n}`;
    const name = base.slice(0, 24 - suf.length) + suf;
    if (!taken.has(name)) return name;
  }
  return base.slice(0, 20) + "-cp";
}

/* ───────────── Design canvas (SVG, driven by slots) ───────────── */
function DesignCanvas({ code, slots, runs, nodeStable, canEdit, link }: { code: string; slots: SlotValues; runs: RunResult[]; nodeStable: string | null; canEdit: boolean; link?: CanvasLink }) {
  // P4-a: 도면은 **BOM 스냅샷**에서 나온다. 스냅샷이 없으면 뜰 수 없다.
  const runId = runs.find((r) => r.kind === "bom" && r.runId)?.runId ?? null;
  const cap = Number(slots.B ?? 0) || 10;
  const w = 320 + Math.min(cap, 60) * 4;
  // Arrangement: 구획은 **등록된 것**을 쓴다(하드코딩 아님). 현재 슬롯에서 활성인 구획 + 등록 길이.
  const [secs, setSecs] = useState<ArrSection[]>([]);
  const [addName, setAddName] = useState("");
  const [arrOpen, setArrOpen] = useState(false);
  const [arrBusy, setArrBusy] = useState(false);
  const [arrMsg, setArrMsg] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const addRef = useRef<HTMLInputElement | null>(null);
  // 늦게 도착한 서버 재로딩이 사용자의 저장 전 초안을 덮어쓰지 않게 한다(2026-09-26 Windows S41i).
  // 마지막 요청의 응답만 받고, 초안이 마지막 저장본과 다르면(dirty) 서버 값으로 바꾸지 않는다.
  const reqSeq = useRef(0);
  const savedJson = useRef<string | null>(null);
  const secsRef = useRef<ArrSection[]>(secs);
  secsRef.current = secs;
  const [held, setHeld] = useState(false);
  const loadArr = useCallback(async (force = false) => {
    const seq = ++reqSeq.current;
    try {
      const r = await fetch("/api/setup/arrangement?code=" + encodeURIComponent(slots.A ?? "") + "&slots=" + encodeURIComponent(JSON.stringify(slots)));
      const j = await r.json();
      if (seq !== reqSeq.current) return;  // 더 새 요청이 있다 — 이 응답은 버린다
      const dirty = savedJson.current !== null && JSON.stringify(secsRef.current) !== savedJson.current;
      if (r.ok && dirty && !force) {
        setHeld(true);
        setArrMsg("코드가 바뀌어 저장본을 다시 읽지 않았습니다 — 저장하거나 되돌리기");
      } else if (r.ok) {
        const next: ArrSection[] = j.sections ?? [];
        savedJson.current = JSON.stringify(next);
        setSecs(next); setHeld(false);
        if (force) setArrMsg(null);
      }
    } catch { /* 등록 전엔 빈 배열 */ }
    if (seq === reqSeq.current) setLoaded(true);
  }, [slots]);
  useEffect(() => { loadArr(); }, [loadArr]);
  const visible = secs.filter((s) => s.active !== false);  // 조건부로 꺼진 구획은 개념도에 그리지 않는다(도면과 같게)
  const sections = visible.length > 0 ? visible.map((s) => s.name) : ["—"];
  const sw = w / sections.length;
  async function saveArr(next: ArrSection[]) {
    if (!canEdit) return;
    setArrBusy(true); setArrMsg(null);
    // Arrangement 2차: 배열 순서가 곧 구획 순서(Move) · 빠진 이름은 삭제(Delete) · 새 이름은 추가(Add)
    const body = { code: slots.A ?? "", sections: next.map((s) => ({ name: s.name, ...(s.len != null ? { len: s.len } : {}), ...(s.dir ? { dir: s.dir } : {}), components: s.components ?? [] })) };
    const r = await fetch("/api/setup/arrangement", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setArrBusy(false);
    if (r.ok) { savedJson.current = JSON.stringify(next); setSecs(next); setHeld(false); setArrMsg("저장 · 다음 BOM Run 부터 순서·전장·방향에 반영됩니다"); } else setArrMsg(`거부: ${j.error ?? r.status}`);
  }
  const move = (i: number, d: -1 | 1) => setSecs((xs) => {
    const j = i + d; if (j < 0 || j >= xs.length) return xs;
    const out = [...xs]; const t = out[i]!; out[i] = out[j]!; out[j] = t; return out;
  });
  const del = (i: number) => setSecs((xs) => xs.filter((_, j) => j !== i));
  // ── p58 툴바 명령: 초안(secs)만 바꾸고 패널을 연다. 반영은 기존 '저장' 한 곳에서만. ──
  const sel = link?.sel ?? null;
  const selRow = secs.find((s) => s.name === sel) ?? null;
  useEffect(() => {
    if (sel && loaded && !secs.some((s) => s.name === sel)) link?.onSel(null);  // 코드가 바뀌어 사라진 구획
  }, [secs, sel, loaded, link]);
  useEffect(() => () => link?.onMoving(false), []);  // eslint-disable-line react-hooks/exhaustive-deps
  const cmd = link?.cmd ?? null;
  useEffect(() => {
    if (!cmd || !loaded || !link) return;
    link.done();
    if (!canEdit) return;
    setArrOpen(true);
    const c = cmd.cmd;
    if (c === "add") { setArrMsg("새 구획 이름을 적고 Add → 저장"); window.setTimeout(() => addRef.current?.focus(), 0); return; }
    if (c === "arrangement") return;
    const row = secs.find((s) => s.name === link.sel);
    if (!row) { setArrMsg("먼저 개념도에서 구획을 고르십시오"); return; }
    if (c === "delete") {
      if (row.locked) { setArrMsg(`${row.name} 은 BOM 관계가 걸린 구획이라 지울 수 없습니다`); return; }
      setSecs((xs) => xs.filter((x) => x.name !== row.name));
      link.onSel(null); link.onMoving(false);
      setArrMsg(`초안에서 ${row.name} 삭제 — 저장해야 반영됩니다`);
    } else if (c === "copy") {
      const name = copyName(row.name, new Set(secs.map((x) => x.name)));
      // 길이·방향만 복사한다. 부품 배치는 그 구획의 BOM 자식만 가능하므로 새 구획에는 비워 둔다. 조건(when)은 등록 데이터라 따라가지 않는다.
      setSecs((xs) => { const i = xs.findIndex((x) => x.name === row.name); const out = [...xs]; out.splice(i + 1, 0, { name, len: row.len, dir: row.dir, active: true, locked: false, when: false, components: [] }); return out; });
      link.onSel(name);
      setArrMsg(`초안에 ${name} 복사 — 저장해야 반영됩니다`);
    } else if (c === "move") {
      const next = !link.moving;
      link.onMoving(next);
      setArrMsg(next ? `${row.name} 을 옮길 자리의 구획을 개념도에서 누르십시오 (Move 를 다시 누르면 취소)` : "이동 취소");
    }
  }, [cmd, loaded]);  // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (name: string) => {
    if (!link) return;
    if (link.moving && sel && name !== sel) {
      setSecs((xs) => {
        const from = xs.findIndex((x) => x.name === sel); const to = xs.findIndex((x) => x.name === name);
        if (from < 0 || to < 0) return xs;
        const out = [...xs]; const [it] = out.splice(from, 1); out.splice(to, 0, it!); return out;
      });
      link.onMoving(false);
      setArrOpen(true);
      setArrMsg(`초안에서 ${sel} 을 ${name} 자리로 이동 — 저장해야 반영됩니다`);
      return;
    }
    link.onSel(name === sel ? null : name);
  };
  const add = () => {
    const name = addName.trim();
    if (!name || secs.some((s) => s.name === name)) { setArrMsg(name ? `이미 있는 구획: ${name}` : "구획 이름을 적으십시오"); return; }
    setSecs((xs) => [...xs, { name, len: null, dir: null, active: true, locked: false, when: false }]);
    setAddName(""); setArrMsg(null);
  };
  return (
    <div data-testid="design-canvas" data-loaded={loaded ? "1" : "0"} style={card}>
      <div style={h}>
        Design · Arrangement <span style={muted}>({code || "—"})</span>
        {sel && (
          <span data-testid="canvas-selected" data-moving={link?.moving ? "1" : "0"} style={{ ...muted, marginLeft: 8, color: "var(--accent)" }}>
            선택 {sel}{link?.moving ? " · 옮길 자리를 누르십시오" : ""}{selRow?.locked ? " · BOM 관계 있음" : ""}
          </span>
        )}
        {canEdit && (
          <button type="button" data-testid="arrangement-edit" onClick={() => setArrOpen((v) => !v)}
            style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: arrOpen ? "var(--accent-contrast)" : "var(--ink-muted)", background: arrOpen ? "var(--accent)" : "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}>
            Arrangement
          </button>
        )}
      </div>
      {arrOpen && canEdit && (
        <div data-testid="arrangement-panel" style={{ ...card, margin: "0 0 10px", padding: 10, background: "var(--surface-1)" }}>
          <p style={{ ...muted, margin: "0 0 6px" }}>구획 순서(↑↓) · 길이(mm) · 방향(p36 L0~R270) · 추가/삭제. 길이를 비우면 도면이 치수표의 L 로 균등 분할합니다. 저장은 다음 BOM Run 부터 반영됩니다.</p>
          <table data-testid="arr-table" style={{ borderCollapse: "collapse", fontSize: 11, color: "var(--ink)" }}>
            <thead><tr style={{ color: "var(--ink-muted)" }}>
              <th style={arrTh}>순서</th><th style={arrTh}>구획</th><th style={arrTh}>길이(mm)</th><th style={arrTh}>방향</th><th style={arrTh}>Component 배치(앞·중·뒤 / 상·중·하)</th><th style={arrTh}></th>
            </tr></thead>
            <tbody>
              {secs.map((s, i) => (
                <tr key={s.name} data-testid={`arr-row-${s.name}`}>
                  <td style={arrTd}>
                    <button type="button" data-testid={`arr-up-${s.name}`} disabled={i === 0} onClick={() => move(i, -1)} style={arrMini(i === 0)}>↑</button>
                    <button type="button" data-testid={`arr-down-${s.name}`} disabled={i === secs.length - 1} onClick={() => move(i, 1)} style={arrMini(i === secs.length - 1)}>↓</button>
                  </td>
                  <td style={{ ...arrTd, fontFamily: "var(--font-mono)" }}>
                    {s.name}
                    {s.when && <span style={{ ...muted, marginLeft: 6 }}>조건부{s.active ? "" : " · 지금 슬롯에서 꺼짐"}</span>}
                  </td>
                  <td style={arrTd}>
                    <input type="number" min={0} data-testid={`arr-len-${s.name}`} value={s.len ?? ""} placeholder="L"
                      onChange={(e) => setSecs((xs) => xs.map((x, j) => (j === i ? { ...x, len: e.target.value === "" ? null : Number(e.target.value) } : x)))}
                      style={{ width: 76, fontFamily: "var(--font-mono)", fontSize: 12, padding: "3px 5px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)" }} />
                  </td>
                  <td style={arrTd}>
                    <select data-testid={`arr-dir-${s.name}`} value={s.dir ?? ""}
                      onChange={(e) => setSecs((xs) => xs.map((x, j) => (j === i ? { ...x, dir: e.target.value === "" ? null : e.target.value } : x)))}
                      style={{ fontFamily: "var(--font-mono)", fontSize: 12, padding: "3px 5px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)" }}>
                      <option value="">— 없음</option>
                      {DIRS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </td>
                  <td style={arrTd}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 260 }} data-testid={`arr-comp-${s.name}`}>
                      {(s.children ?? []).map((ch) => {
                        const cur = (s.components ?? []).find((c) => c.code === ch);
                        const set = (field: "at" | "level", v: string) => setSecs((xs) => xs.map((x, j) => {
                          if (j !== i) return x;
                          const rest = (x.components ?? []).filter((c) => c.code !== ch);
                          if (!v && field === "at") return { ...x, components: rest };                    // 앞/중/뒤를 비우면 배치 해제
                          const base = cur ?? { code: ch, at: "center", level: "mid" };
                          return { ...x, components: [...rest, { ...base, [field]: v || base[field] }] };
                        }));
                        return (
                          <span key={ch} style={{ display: "inline-flex", gap: 2, alignItems: "center", fontSize: 10 }}>
                            <span style={{ fontFamily: "var(--font-mono)" }}>{ch}</span>
                            <select data-testid={`arr-at-${s.name}-${ch}`} value={cur?.at ?? ""} disabled={!canEdit}
                              onChange={(e) => set("at", e.target.value)} style={{ fontSize: 10, padding: "0 2px", border: "1px solid var(--line)", borderRadius: 3, background: "var(--surface-0)", color: "var(--ink)" }}>
                              <option value="">—</option>
                              {ATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                            {cur && (
                              <select data-testid={`arr-lv-${s.name}-${ch}`} value={cur.level} disabled={!canEdit}
                                onChange={(e) => set("level", e.target.value)} style={{ fontSize: 10, padding: "0 2px", border: "1px solid var(--line)", borderRadius: 3, background: "var(--surface-0)", color: "var(--ink)" }}>
                                {LVS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                              </select>
                            )}
                          </span>
                        );
                      })}
                      {(s.children ?? []).length === 0 && <span style={muted}>부품 없음</span>}
                    </div>
                  </td>
                  <td style={arrTd}>
                    <button type="button" data-testid={`arr-del-${s.name}`} disabled={s.locked} title={s.locked ? "BOM 관계가 걸린 구획입니다" : "구획 삭제"}
                      onClick={() => del(i)} style={arrMini(s.locked)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
            <input ref={addRef} data-testid="arr-add-name" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="새 구획 이름"
              style={{ width: 130, fontSize: 12, padding: "3px 6px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)" }} />
            <button type="button" data-testid="arr-add" onClick={add} style={arrMini(false)}>Add</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
            <button type="button" data-testid="arr-save" disabled={arrBusy} onClick={() => saveArr(secs)}
              style={{ fontSize: "var(--fs-12)", fontWeight: 600, color: "var(--accent-contrast)", background: "var(--accent)", border: "none", borderRadius: 4, padding: "4px 12px", cursor: "pointer" }}>
              저장
            </button>
            {held && (
              <button type="button" data-testid="arr-revert" disabled={arrBusy} onClick={() => loadArr(true)}
                style={{ fontSize: "var(--fs-12)", color: "var(--ink)", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 4, padding: "4px 12px", cursor: "pointer" }}>
                되돌리기
              </button>
            )}
            {arrMsg && <span data-testid="arr-msg" style={muted}>{arrMsg}</span>}
          </div>
        </div>
      )}
      <svg viewBox={`0 0 ${w + 40} 220`} width="100%" style={{ maxWidth: 760, display: "block" }}>
        <rect x="20" y="40" width={w} height="120" rx="6" fill="var(--surface-1)" stroke="var(--ink)" strokeWidth="1.5" />
        {visible.length > 0 ? (() => {
          const total = visible.reduce((a, s) => a + (s.len ?? 900), 0) || 1;
          let acc = 0;
          return visible.map((s) => {
            const x = 20 + (acc / total) * w; const sww = ((s.len ?? 900) / total) * w; acc += s.len ?? 900;
            return (
              <g key={s.name} data-testid={`canvas-sec-${s.name}`} data-selected={s.name === sel ? "1" : undefined}
                onClick={() => pick(s.name)} style={{ cursor: link ? "pointer" : "default" }}>
                <rect x={x} y="40" width={sww} height="120" fill={s.name === sel ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent"}
                  stroke={s.name === sel ? "var(--accent)" : "var(--line)"} strokeWidth={s.name === sel ? 2 : 1} />
                <text x={x + sww / 2} y="100" textAnchor="middle" fontSize="12" fill="var(--ink)" fontFamily="var(--font-body)">{s.name}</text>
                <text x={x + sww / 2} y="118" textAnchor="middle" fontSize="10" fill="var(--ink-muted)" fontFamily="var(--font-mono)">{s.len ?? "L"}</text>
              </g>
            );
          });
        })() : (
          <text x={20 + w / 2} y="105" textAnchor="middle" fontSize="12" fill="var(--ink-muted)">코드를 고르면 구획이 나타납니다</text>
        )}
        <line x1="20" y1="180" x2={20 + w} y2="180" stroke="var(--accent)" strokeWidth="1" />
        <text x={20 + w / 2} y="200" textAnchor="middle" fontSize="12" fill="var(--accent)" fontFamily="var(--font-mono)">
          개념도 · 용량 {slots.B ?? "—"} <tspan fill="var(--ink-muted)">(실제 치수는 아래 DXF — 등록 표 기준)</tspan>
        </text>
        <text x="20" y="28" fontSize="12" fill="var(--ink-muted)" fontFamily="var(--font-mono)">
          {slots.A ?? "—"} series {slots.C ?? "—"} {slots.E ? `· ${slots.E}` : ""}
        </text>
      </svg>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
        <a
          data-testid="dxf-download"
          href={runId ? `/api/dxf?runId=${runId}&type=plan` : "#"}
          style={{ fontSize: "var(--fs-12)", color: runId ? "var(--accent-contrast)" : "var(--ink)", background: runId ? "var(--accent)" : "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "5px 10px", textDecoration: "none", opacity: runId ? 1 : 0.5, pointerEvents: runId ? "auto" : "none" }}
        >
          평면도 DXF
        </a>
        <a
          data-testid="dxf-front"
          href={runId ? `/api/dxf?runId=${runId}&type=front` : "#"}
          style={{ fontSize: "var(--fs-12)", color: "var(--ink)", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "5px 10px", textDecoration: "none", opacity: runId ? 1 : 0.5, pointerEvents: runId ? "auto" : "none" }}
        >
          정면도 DXF
        </a>
        <a
          data-testid="dxf-right"
          href={runId ? `/api/dxf?runId=${runId}&type=right` : "#"}
          style={{ fontSize: "var(--fs-12)", color: "var(--ink)", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "5px 10px", textDecoration: "none", opacity: runId ? 1 : 0.5, pointerEvents: runId ? "auto" : "none" }}
        >
          우측면도 DXF
        </a>
        <a
          data-testid="dxf-iso"
          href={runId ? `/api/dxf?runId=${runId}&type=iso` : "#"}
          style={{ fontSize: "var(--fs-12)", color: "var(--ink)", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "5px 10px", textDecoration: "none", opacity: runId ? 1 : 0.5, pointerEvents: runId ? "auto" : "none" }}
        >
          3D 등각도 DXF
        </a>
        <a
          data-testid="dxf-exploded"
          href={runId ? `/api/dxf?runId=${runId}&type=exploded` : "#"}
          style={{ fontSize: "var(--fs-12)", color: "var(--ink)", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "5px 10px", textDecoration: "none", opacity: runId ? 1 : 0.5, pointerEvents: runId ? "auto" : "none" }}
        >
          분해도 DXF
        </a>
        <a
          data-testid="dxf-assembly"
          href={runId ? `/api/dxf?runId=${runId}&type=assembly` : "#"}
          style={{ fontSize: "var(--fs-12)", color: "var(--ink)", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "5px 10px", textDecoration: "none", opacity: runId ? 1 : 0.5, pointerEvents: runId ? "auto" : "none" }}
        >
          조립도 DXF
        </a>
        <DrawingRegister runId={runId} nodeStable={nodeStable} canEdit={canEdit} verify={runs.find((r) => r.kind === "bom" && r.runId)?.dims} />
        <span style={muted}>
          {runId
            ? "치수는 등록된 Key Dimension 표(p38~40)에서 옵니다. R12 DXF — AutoCAD·FreeCAD"
            : "먼저 BOM Run 을 실행하세요 — 도면은 BOM 스냅샷에서 나옵니다."}
        </span>
      </div>
    </div>
  );
}

/* ───────────── Document panel · P4-b (p66 견적 · p15~16 Tech Data · p51 구매 요청) ───────────── */
/**
 * 세 산출물 모두 **BOM 스냅샷 하나**에서 나온다. 스냅샷이 없으면 버튼이 잠기고,
 * 화면은 숫자를 계산하지 않는다 — 서버가 스냅샷에서 읽어 만든 것을 보여 줄 뿐이다.
 */
const DOC_LABEL: Record<string, string> = { draft: "작성중", review: "검토", approved: "승인", issued: "발행" };
const DOC_NEXT: Record<string, string> = { draft: "review", review: "approved", approved: "issued" };
const DOC_TYPE_LABEL: Record<string, string> = { quotation: "견적", techdata: "Tech Data" };
const btn: CSSProperties = { fontSize: "var(--fs-12)", padding: "5px 10px", background: "var(--surface-1)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)" };

function DocumentPanel({ project, code, runs, nodeStable, canEdit }: { project: WorkbenchProject | null; code: string; runs: RunResult[]; nodeStable: string | null; canEdit: boolean }) {
  const runId = runs.find((r) => r.kind === "bom" && r.runId)?.runId ?? null;
  const [docs, setDocs] = useState<{ id: string; docNo: string; docType: string; currentRev: string; status: string }[]>([]);
  const [prs, setPrs] = useState<{ id: string; prNo: string; status: string; bomRunId: string; lines: unknown[] }[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // 0022 · p16 Input Data 템플릿 — Tech Data 를 만들 때 받는 값(기본값으로 시작). 문서 body 에 스냅샷으로 들어간다.
  const [inItems, setInItems] = useState<{ key: string; label: string; unit: string; defaultValue: number | null; minValue: number | null; maxValue: number | null }[]>([]);
  const [inVals, setInVals] = useState<Record<string, string>>({});
  useEffect(() => {
    fetch("/api/setup/input-items").then((r) => r.json()).then((j) => {
      const rows = (j.rows ?? []) as typeof inItems;
      setInItems(rows);
      setInVals(Object.fromEntries(rows.map((x) => [x.key, x.defaultValue == null ? "" : String(x.defaultValue)])));
    }).catch(() => setInItems([]));
  }, []);

  const load = useCallback(async () => {
    const q = nodeStable ? `?node=${nodeStable}` : "";
    const [d, p] = await Promise.all([
      fetch(`/api/documents${q}`).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/purchase-requests${q}`).then((r) => r.json()).catch(() => ({})),
    ]);
    setDocs((d as { rows?: typeof docs }).rows ?? []);
    setPrs((p as { rows?: typeof prs }).rows ?? []);
  }, [nodeStable]);
  useEffect(() => { void load(); }, [load]);

  async function post(url: string, body: object) {
    if (!runId || busy) return;
    setBusy(true); setMsg(null);
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as { error?: string; message?: string };
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: j.message ?? "완료" } : { ok: false, text: j.error ?? "실패" });
    await load();
  }
  async function advance(id: string, status: string) {
    setMsg(null);
    const r = await fetch(`/api/documents/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    if (!r.ok) setMsg({ ok: false, text: j.error ?? "상태 변경 실패" });
    await load();
  }
  const off = !runId || !canEdit || busy;
  const prOfRun = prs.find((p) => p.bomRunId === runId) ?? null;

  return (
    <div data-testid="document-panel" style={card}>
      <div style={h}>Document · 견적 · Tech Data · 구매 요청</div>
      <dl style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "4px 8px", fontSize: "var(--fs-13)", margin: "0 0 10px" }}>
        <dt style={muted}>프로젝트</dt>
        <dd style={{ margin: 0 }}>{project ? `${project.projectNo} · ${project.name}` : "—"}</dd>
        <dt style={muted}>고객</dt>
        <dd style={{ margin: 0 }}>{project?.clientName ?? "—"}</dd>
        <dt style={muted}>RCCS 코드</dt>
        <dd style={{ margin: 0 }}><CodeChip code={code || "—"} /></dd>
        <dt style={muted}>BOM 스냅샷</dt>
        <dd data-testid="document-run" style={{ margin: 0, fontFamily: "var(--font-mono)" }}>{runId ? runId.slice(0, 8) : "없음 — 먼저 BOM Run 을 실행하세요"}</dd>
      </dl>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" data-testid="doc-make-quotation" disabled={off} onClick={() => void post("/api/documents", { runId, type: "quotation" })} style={{ ...btn, opacity: off ? 0.5 : 1 }}>견적서 등록 (PCR·Quotation)</button>
        <button type="button" data-testid="doc-make-techdata" disabled={off} onClick={() => void post("/api/documents", { runId, type: "techdata", ...(inItems.length ? { inputData: inVals } : {}) })} style={{ ...btn, opacity: off ? 0.5 : 1 }}>Tech Data 등록</button>
        <button type="button" data-testid="pr-make" disabled={off || !!prOfRun} onClick={() => void post("/api/purchase-requests", { runId })} style={{ ...btn, opacity: off || prOfRun ? 0.5 : 1 }}>
          {prOfRun ? `구매 요청 있음 · ${prOfRun.prNo}` : "구매 요청 만들기"}
        </button>
        <a data-testid="doc-print-setup" href="/setup/print" style={{ marginLeft: "auto", fontSize: "var(--fs-12)", color: "var(--accent)", alignSelf: "center" }}>Print 설정 (p48) →</a>
      </div>
      {inItems.length > 0 && (
        <div data-testid="doc-inputdata" style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginTop: 8, fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>
          <span style={{ fontWeight: 600 }}>Tech Data · Input Data (p16)</span>
          {inItems.map((x) => (
            <label key={x.key} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span>{x.label}{x.unit ? ` (${x.unit})` : ""}{x.minValue != null || x.maxValue != null ? ` · ${x.minValue ?? "−∞"}~${x.maxValue ?? "∞"}` : ""}</span>
              <input data-testid={`doc-in-${x.key}`} value={inVals[x.key] ?? ""} onChange={(e) => setInVals({ ...inVals, [x.key]: e.target.value })}
                style={{ width: 90, fontFamily: "var(--font-mono)", fontSize: "var(--fs-12)", padding: "3px 6px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)" }} />
            </label>
          ))}
          <a href="/setup/input-data" style={{ color: "var(--accent)" }}>템플릿 →</a>
          <span>아직 없음: Output Data 계산(밀도 등) · 그래프 · Coding List</span>
        </div>
      )}
      {msg && <p data-testid="document-msg" data-ok={msg.ok ? "1" : "0"} style={{ margin: "8px 0 0", fontSize: "var(--fs-12)", color: msg.ok ? "var(--accent)" : "var(--warn)" }}>{msg.text}</p>}

      {docs.length > 0 && (
        <table data-testid="document-list" style={{ width: "100%", borderCollapse: "collapse", marginTop: 12, fontSize: "var(--fs-12)" }}>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} data-testid="document-row" data-type={d.docType} data-status={d.status} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: "5px 6px", width: 84, color: "var(--ink-muted)" }}>{DOC_TYPE_LABEL[d.docType] ?? d.docType}</td>
                <td style={{ padding: "5px 6px" }}>
                  <a href={`/api/documents/${d.id}/print`} target="_blank" rel="noreferrer" style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{d.docNo} Rev {d.currentRev}</a>
                </td>
                <td style={{ padding: "5px 6px", width: 60 }}>{DOC_LABEL[d.status] ?? d.status}</td>
                <td style={{ padding: "5px 6px", width: 90, textAlign: "right" }}>
                  {canEdit && DOC_NEXT[d.status] && (
                    <button type="button" data-testid={`doc-advance-${d.docNo}-${d.currentRev}`} onClick={() => void advance(d.id, DOC_NEXT[d.status]!)} style={{ ...btn, padding: "2px 8px", background: "transparent" }}>→ {DOC_LABEL[DOC_NEXT[d.status]!]}</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {prs.length > 0 && (
        <p data-testid="document-pr-note" style={{ ...muted, margin: "10px 0 0" }}>
          구매 요청 {prs.map((p) => `${p.prNo}(${p.lines.length}줄)`).join(" · ")} — Process·Export 는 <a href="/m/purchasing" style={{ color: "var(--accent)" }}>Purchasing</a> 에서.
        </p>
      )}
      <p style={{ ...muted, margin: "10px 0 0" }}>문서 번호를 누르면 인쇄본(흰 A4)이 열립니다. 같은 코드로 다시 등록하면 개정(A→B)이 붙고 앞 개정은 남습니다. 발행된 문서는 잠깁니다.</p>
    </div>
  );
}

function KeyDims({ slots, runs }: { slots: SlotValues; runs: RunResult[] }) {
  const last = runs.find((r) => r.kind === "edim" && r.status === "ran");
  // P4-a: 단면은 **등록된 Key Dimension 표**에서 온다(BOM Run 이 함께 돌려준다).
  // 화면이 자기 공식으로 만들어 낸 숫자를 보여 주면 도면과 어긋난다.
  const d = runs.find((r) => r.kind === "bom" && r.dims)?.dims ?? null;
  const cap = Number(slots.B ?? 0) || 0;
  const dims = [
    ["풍량", cap ? `${cap * 1000} CMH` : "—"],
    ["단면(등록)", d ? `${d.W}×${d.H}` : "BOM Run 필요"],
    ["전장(등록)", d ? `${d.L * Math.max(d.sections, 1)}` : "—"],
    ["패널", slots.C === "2123" ? "이중 50T" : slots.C === "3110" ? "위생 50T" : "표준 25T"],
    ["매크로 산출", typeof last?.value === "number" ? String(Math.round(last.value * 1000) / 1000) : last?.value != null ? String(last.value) : "—"],
  ];
  return (
    <div style={{ display: "flex", gap: 14, fontSize: "var(--fs-13)" }}>
      {dims.map(([k, v]) => (
        <span key={k}>
          <span style={muted}>{k} </span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{v}</span>
        </span>
      ))}
    </div>
  );
}

/* ───────────── P4-a · 도면 등록 (p24 Drawings) ───────────── */
/**
 * 뜬 도면을 **남긴다**. 남긴 도면은 번호·개정·상태를 갖고, 발행되면 잠긴다.
 * 같은 번호를 다시 뜨면 개정이 붙어 전/후를 비교할 수 있다 — 치수를 바꾼 뒤
 * "무엇이 달라졌나"를 도면으로 확인하기 위해서다.
 */
const DRAW_LABEL: Record<string, string> = { draft: "작성중", review: "검토", approved: "승인", issued: "발행" };
const DRAW_NEXT: Record<string, string> = { draft: "review", review: "approved", approved: "issued" };
/** 0020 · 도면 용도(p17 · p39) — 승인도·제작도·견적도. 발행 뒤에는 바꿀 수 없다(DB 트리거). */
const DRAW_PURPOSE: Record<string, string> = { approval: "승인도", manufacturing: "제작도", quotation: "견적도" };

function DrawingRegister({ runId, nodeStable, canEdit, verify }: { runId: string | null; nodeStable: string | null; canEdit: boolean; verify?: RunResult["dims"] }) {
  const [rows, setRows] = useState<{ id: string; drawingNo: string; currentRev: string; status: string; drawingType: string; meta: unknown; purpose: string | null }[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [purpose, setPurpose] = useState("");   // 등록(발행 흐름의 시작) 때 고르는 용도 — 비우면 미지정
  const [filter, setFilter] = useState("");     // 목록 거르기 — "" = 전체
  const [listed, setListed] = useState(false);

  const load = useCallback(async () => {
    const q = new URLSearchParams();
    if (nodeStable) q.set("node", nodeStable);
    if (filter) q.set("purpose", filter);
    const qs = q.toString();
    const r = await fetch(`/api/drawings${qs ? `?${qs}` : ""}`);
    const j = (await r.json().catch(() => ({}))) as { rows?: typeof rows };
    setRows(j.rows ?? []);
    setListed(true);
  }, [nodeStable, filter]);
  useEffect(() => { void load(); }, [load]);

  async function make(type: "plan" | "front" | "right" | "assembly" | "iso" | "exploded") {
    if (!runId || busy) return;
    setBusy(true); setErr(null);
    const r = await fetch("/api/drawings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runId, type, ...(purpose ? { purpose } : {}) }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? "도면 생성 실패"); return; }
    await load();
  }
  async function advance(id: string, status: string) {
    setErr(null);
    const r = await fetch(`/api/drawings/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    if (!r.ok) { setErr(j.error ?? "상태 변경 실패"); return; }
    await load();
  }

  return (
    <span data-testid="drawing-register" data-listed={listed ? "1" : "0"} data-filter={filter} style={{ display: "inline-flex", flexDirection: "column", gap: 6 }}>
      <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>
        용도
        <select data-testid="drawing-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} disabled={!canEdit}
          style={{ fontSize: "var(--fs-12)", padding: "3px 6px", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", background: "var(--surface-0)", color: "var(--ink)" }}>
          <option value="">미지정</option>
          {Object.entries(DRAW_PURPOSE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span>목록</span>
        <select data-testid="drawing-filter" value={filter} onChange={(e) => { setListed(false); setFilter(e.target.value); }}
          style={{ fontSize: "var(--fs-12)", padding: "3px 6px", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", background: "var(--surface-0)", color: "var(--ink)" }}>
          <option value="">전체</option>
          {Object.entries(DRAW_PURPOSE).map(([k, v]) => <option key={k} value={k}>{v}만</option>)}
          <option value="none">미지정만</option>
        </select>
        <span>아직 없음: Sub Drawing(구획별 하부 도면) · Detail Dimension(mm 좌표 — 회사 실 CAD 규칙 필요)</span>
      </span>
      <span style={{ display: "inline-flex", gap: 8 }}>
        {(() => {
          // p36 Design Verification — 판정은 BOM Run 때 스냅샷에 박힌 값을 그대로 보여 준다(화면이 다시 재지 않는다)
          const d = verify;
          if (!d || !d.rules) return null;
          const v = d.violations ?? [];
          return (
            <span data-testid="design-verify" data-ok={v.length === 0}
              style={{ fontSize: "var(--fs-12)", padding: "5px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)",
                background: v.length === 0 ? "var(--surface-2)" : "#fdecec", color: v.length === 0 ? "var(--ink-muted)" : "#b4232a" }}>
              {v.length === 0
                ? `설계 검증 통과 · 규칙 ${d.rules}`
                : `설계 검증 위반 ${v.length} — ${v.map((x) => `${x.name}(${x.target} ${x.op} ${x.limit} · 지금 ${x.actual})`).join(", ")} · 도면은 뜨지 않습니다`}
            </span>
          );
        })()}
        <button type="button" data-testid="drawing-make-plan" disabled={!runId || !canEdit || busy} onClick={() => void make("plan")}
          style={{ fontSize: "var(--fs-12)", padding: "5px 10px", background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", opacity: runId && canEdit ? 1 : 0.5 }}>
          평면도 등록
        </button>
        {/* 3각법(0012 · 코퍼스 "2D 3각법 View") — 같은 스냅샷 치수에서 정면·우측면을 뜬다 */}
        <button type="button" data-testid="drawing-make-front" disabled={!runId || !canEdit || busy} onClick={() => void make("front")}
          style={{ fontSize: "var(--fs-12)", padding: "5px 10px", background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", opacity: runId && canEdit ? 1 : 0.5 }}>
          정면도 등록
        </button>
        <button type="button" data-testid="drawing-make-right" disabled={!runId || !canEdit || busy} onClick={() => void make("right")}
          style={{ fontSize: "var(--fs-12)", padding: "5px 10px", background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", opacity: runId && canEdit ? 1 : 0.5 }}>
          우측면도 등록
        </button>
        {/* 3D 투영(0013 · 코퍼스 3D View) — 형상 모델이 아니라 같은 스냅샷의 등각 투영이다 */}
        <button type="button" data-testid="drawing-make-iso" disabled={!runId || !canEdit || busy} onClick={() => void make("iso")}
          style={{ fontSize: "var(--fs-12)", padding: "5px 10px", background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", opacity: runId && canEdit ? 1 : 0.5 }}>
          3D 등각도 등록
        </button>
        <button type="button" data-testid="drawing-make-exploded" disabled={!runId || !canEdit || busy} onClick={() => void make("exploded")}
          style={{ fontSize: "var(--fs-12)", padding: "5px 10px", background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", opacity: runId && canEdit ? 1 : 0.5 }}>
          분해도 등록
        </button>
        <button type="button" data-testid="drawing-make-assembly" disabled={!runId || !canEdit || busy} onClick={() => void make("assembly")}
          style={{ fontSize: "var(--fs-12)", padding: "5px 10px", background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", opacity: runId && canEdit ? 1 : 0.5 }}>
          조립도 등록
        </button>
      </span>
      {err && <span data-testid="drawing-error" style={{ color: "var(--warn)", fontSize: "var(--fs-12)" }}>{err}</span>}
      {rows.length > 0 && (
        <span data-testid="drawing-list" style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
          {rows.map((d) => (
            <span key={d.id} data-testid="drawing-row" data-status={d.status} data-purpose={d.purpose ?? ""} style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: "var(--fs-12)" }}>
              <a href={`/api/drawings/${d.id}`} style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
                {d.drawingNo} Rev {d.currentRev}
              </a>
              {d.purpose && <span style={{ padding: "0 6px", borderRadius: 3, border: "1px solid var(--accent)", color: "var(--accent)", fontSize: 11 }}>{DRAW_PURPOSE[d.purpose] ?? d.purpose}</span>}
              <span>{DRAW_LABEL[d.status] ?? d.status}</span>
              {canEdit && DRAW_NEXT[d.status] && (
                <button type="button" data-testid={`drawing-advance-${d.drawingNo}-${d.currentRev}`} onClick={() => void advance(d.id, DRAW_NEXT[d.status]!)}
                  style={{ fontSize: "var(--fs-12)", padding: "2px 8px", background: "transparent", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)" }}>
                  → {DRAW_LABEL[DRAW_NEXT[d.status]!]}
                </button>
              )}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
