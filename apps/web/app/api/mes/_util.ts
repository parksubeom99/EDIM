import { NextResponse } from "next/server";
import { MesRuleError } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canEditMes } from "@/app/lib/mes-run";

/** ccmd L · LA-2 — MES API 공통: 로그인 · 쓰기 역할(owner · engineer · cad) · 규칙 오류 → 상태 코드 */
export async function sessionOr401() {
  const s = await getServerSession();
  return s ? { s } : { res: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
}
export async function editorOr403() {
  const r = await sessionOr401();
  if ("res" in r) return r;
  if (!canEditMes(r.s.role)) return { res: NextResponse.json({ error: "forbidden — 생산 · 창고 · 품질 쓰기는 owner · engineer · cad" }, { status: 403 }) };
  return r;
}
export function mesError(e: unknown) {
  if (e instanceof MesRuleError) return NextResponse.json({ error: e.message }, { status: e.status });
  throw e;
}
export const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
export const str = (v: unknown, max = 80): string | null => (typeof v === "string" && v.trim() && v.trim().length <= max ? v.trim() : null);
export const ymd = (v: unknown): Date | null | undefined =>
  v === null || v === "" ? null : typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? new Date(`${v}T00:00:00Z`) : undefined;
