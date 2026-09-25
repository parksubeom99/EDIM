import type { TenantClient } from "./tenant";
import { requireTenant } from "./tenant";
import { writeAudit } from "./audit";

/**
 * p48 Print Set-up Form. 설정 값의 모양·기본값·검증은 여기 한 곳에 둔다(화면·API·렌더러가 같이 쓴다).
 * 저장이 없으면 기본값 — 지금까지의 인쇄본과 같은 모양(A4 세로 · 16/14mm · 12.5px · 칼라).
 */
export const PRINT_DOC_TYPES = ["quotation", "techdata"] as const;
export type PrintDocType = (typeof PRINT_DOC_TYPES)[number];
export const PAPERS = ["A4", "A3", "Letter"] as const;
export const FONTS = ["Pretendard", "Noto Sans KR", "Noto Serif KR", "Malgun Gothic"] as const;

export interface PrintSettings {
  paper: (typeof PAPERS)[number];
  orientation: "portrait" | "landscape";
  marginMm: number;
  font: (typeof FONTS)[number];
  fontSizePx: number;
  color: "color" | "mono";
  header: string;
  footer: string;
  watermark: string;
}

export const DEFAULT_PRINT: PrintSettings = {
  paper: "A4", orientation: "portrait", marginMm: 15, font: "Pretendard", fontSizePx: 12.5, color: "color", header: "", footer: "", watermark: "",
};

export const isPrintDocType = (v: unknown): v is PrintDocType => typeof v === "string" && (PRINT_DOC_TYPES as readonly string[]).includes(v);

/** 들어온 값을 검증해 완전한 설정으로 만든다. 틀린 필드가 있으면 그 이름을 돌려준다(부분 저장 없음). */
export function parsePrintSettings(v: unknown): { ok: true; settings: PrintSettings } | { ok: false; field: string } {
  const o = (v ?? {}) as Record<string, unknown>;
  const s: PrintSettings = { ...DEFAULT_PRINT };
  const str = (k: keyof PrintSettings, max: number) => {
    if (o[k] === undefined) return true;
    if (typeof o[k] !== "string" || (o[k] as string).length > max) return false;
    (s as unknown as Record<string, unknown>)[k] = (o[k] as string).trim(); return true;
  };
  const one = <T extends string>(k: keyof PrintSettings, allowed: readonly T[]) => {
    if (o[k] === undefined) return true;
    if (!allowed.includes(o[k] as T)) return false;
    (s as unknown as Record<string, unknown>)[k] = o[k]; return true;
  };
  const num = (k: keyof PrintSettings, lo: number, hi: number) => {
    if (o[k] === undefined) return true;
    const n = Number(o[k]);
    if (!Number.isFinite(n) || n < lo || n > hi) return false;
    (s as unknown as Record<string, unknown>)[k] = Math.round(n * 10) / 10; return true;
  };
  const checks: [string, boolean][] = [
    ["paper", one("paper", PAPERS)], ["orientation", one("orientation", ["portrait", "landscape"] as const)],
    ["marginMm", num("marginMm", 5, 30)], ["font", one("font", FONTS)], ["fontSizePx", num("fontSizePx", 9, 16)],
    ["color", one("color", ["color", "mono"] as const)], ["header", str("header", 120)], ["footer", str("footer", 120)], ["watermark", str("watermark", 40)],
  ];
  const bad = checks.find(([, good]) => !good);
  return bad ? { ok: false, field: bad[0] } : { ok: true, settings: s };
}

export async function getPrintSetup(tx: TenantClient, docType: PrintDocType): Promise<{ settings: PrintSettings; saved: boolean; updatedAt: Date | null }> {
  const row = await tx.printSetup.findFirst({ where: { docType } });
  if (!row) return { settings: { ...DEFAULT_PRINT }, saved: false, updatedAt: null };
  const p = parsePrintSettings(row.settings);
  return { settings: p.ok ? p.settings : { ...DEFAULT_PRINT }, saved: true, updatedAt: row.updatedAt };
}

export async function savePrintSetup(tx: TenantClient, docType: PrintDocType, settings: PrintSettings, actorId: string): Promise<void> {
  const tenantId = await requireTenant(tx);
  const before = await tx.printSetup.findFirst({ where: { docType } });
  const data = { settings: settings as unknown as object, updatedAt: new Date(), updatedBy: actorId };
  const row = before
    ? await tx.printSetup.update({ where: { id: before.id }, data })
    : await tx.printSetup.create({ data: { tenantId, docType, ...data } });
  await writeAudit(tx, actorId, before ? "update" : "create", "print_setup", row.id, before ? { settings: before.settings } : null, { docType, settings });
}
