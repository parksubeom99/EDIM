"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ATTACH_EXT, ATTACH_LABEL, type AttachKind, type OwnerKind } from "@/app/lib/attachments";

/**
 * 첨부 패널(0025) — 코드 DWG(p32) · Arrangement Drawing Control(p35) · 작업대 Data Up-Load(p18)가 같이 쓴다.
 * 올리기 · 목록 · 내려받기. 고치기·지우기는 없다(새 파일 = 새 행). 10MB · 종류별 허용 확장자.
 */
interface Row { id: string; kind: AttachKind; name: string; description: string | null; fileSize: number | null; uploadedAt: string }
const lab: CSSProperties = { fontSize: "var(--fs-12)", color: "var(--ink-muted)", fontWeight: 600 };
const td: CSSProperties = { fontSize: "var(--fs-12)", padding: "3px 8px 3px 0", borderBottom: "1px solid var(--line)" };
const kb = (n: number | null) => (n == null ? "—" : n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);

export function AttachmentPanel({ ownerKind, ownerKey, kinds, canEdit, title, testid, disabledReason }: {
  ownerKind: OwnerKind; ownerKey: string; kinds: AttachKind[]; canEdit: boolean; title: string; testid: string; disabledReason?: string | null;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [ready, setReady] = useState(false);
  const [kind, setKind] = useState<AttachKind>(kinds[0]!);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const load = useCallback(async () => {
    const j = await fetch(`/api/attachments?ownerKind=${ownerKind}&ownerKey=${encodeURIComponent(ownerKey)}`).then((r) => r.json()).catch(() => ({}));
    setRows(j.rows ?? []); setReady(true);
  }, [ownerKind, ownerKey]);
  useEffect(() => { setReady(false); setMsg(null); void load(); }, [load]);

  async function upload() {
    if (!file) return;
    setBusy(true); setMsg(null);
    const fd = new FormData();
    fd.set("ownerKind", ownerKind); fd.set("ownerKey", ownerKey); fd.set("kind", kind); fd.set("file", file);
    const r = await fetch("/api/attachments", { method: "POST", body: fd });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: `${ATTACH_LABEL[kind]} 올림 — ${file.name}` } : { ok: false, text: `거부 (${r.status}): ${j.error ?? ""}` });
    if (r.ok) { setFile(null); if (fileRef.current) fileRef.current.value = ""; await load(); }
  }

  return (
    <div data-testid={testid} data-ready={ready ? "1" : "0"} style={{ display: "grid", gap: 6 }}>
      <div style={lab}>{title} · {rows.length}개</div>
      {rows.length > 0 && (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} data-testid={`${testid}-row`} data-kind={a.kind}>
                <td style={{ ...td, width: 64, color: "var(--ink-muted)" }}>{ATTACH_LABEL[a.kind]}</td>
                <td style={td}><a href={`/api/attachments/${a.id}/file`} style={{ color: "var(--accent)" }}>{a.name}</a></td>
                <td style={{ ...td, width: 70, fontFamily: "var(--font-mono)" }}>{kb(a.fileSize)}</td>
                <td style={{ ...td, width: 90, fontFamily: "var(--font-mono)" }}>{String(a.uploadedAt).slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {ready && rows.length === 0 && <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>아직 없습니다.</span>}
      {canEdit && (disabledReason
        ? <span data-testid={`${testid}-locked`} style={{ fontSize: "var(--fs-12)", color: "var(--warn)" }}>{disabledReason}</span>
        : (
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {kinds.length > 1 && (
              <select data-testid={`${testid}-kind`} value={kind} onChange={(e) => setKind(e.target.value as AttachKind)} style={{ fontSize: "var(--fs-12)" }}>
                {kinds.map((k) => <option key={k} value={k}>{ATTACH_LABEL[k]}</option>)}
              </select>
            )}
            <input ref={fileRef} data-testid={`${testid}-file`} type="file" accept={ATTACH_EXT[kind].join(",")} onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ fontSize: 12 }} />
            <button type="button" data-testid={`${testid}-upload`} disabled={busy || !file} onClick={() => void upload()} style={{ fontSize: "var(--fs-12)", fontWeight: 600 }}>올리기 (10MB)</button>
            <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>{ATTACH_EXT[kind].join(" ")}</span>
          </div>
        ))}
      {msg && <span data-testid={`${testid}-msg`} data-ok={msg.ok ? "1" : "0"} style={{ fontSize: "var(--fs-12)", color: msg.ok ? "var(--accent)" : "var(--warn)" }}>{msg.text}</span>}
    </div>
  );
}
