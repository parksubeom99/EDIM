import { NextResponse, type NextRequest } from "next/server";
import { withTenant, mesMaster, saveWorkCenter, saveMachine, saveWorker, saveWarehouse, saveItemMaterial, saveRoute, MES_CODE, MES_SKILL } from "@edim/db";
import { sessionOr401, editorOr403, mesError, num, str } from "../_util";
import { UUID_RE } from "@/app/lib/mes-run";

/** ccmd L · LA1 · p43 — 기준정보: 작업장 · 기계 · 작업자 · 창고 · 품목 자재 정보 · 공정 순서. GET 전부 · POST {kind, row} 한 행 등록/수정. */
export async function GET() {
  const a = await sessionOr401(); if ("res" in a) return a.res;
  return NextResponse.json(await withTenant(a.s.tenantId, (tx) => mesMaster(tx)));
}

export async function POST(req: NextRequest) {
  const a = await editorOr403(); if ("res" in a) return a.res;
  const b = (await req.json().catch(() => ({}))) as { kind?: string; row?: Record<string, unknown> };
  const r = b.row ?? {};
  const code = typeof r.code === "string" && MES_CODE.test(r.code) ? r.code : null;
  const bad = (m: string) => NextResponse.json({ error: m }, { status: 400 });
  try {
    const out = await withTenant(a.s.tenantId, async (tx) => {
      // 외래 키 검사는 RLS 를 보지 않는다 → 가리키는 작업장 · 창고가 **이 회사에** 보이는지 먼저 본다(다른 회사 id = 404)
      const wcOk = async (id: unknown) => typeof id === "string" && UUID_RE.test(id) && !!(await tx.workCenter.findUnique({ where: { id } }));
      const whOk = async (id: unknown) => typeof id === "string" && UUID_RE.test(id) && !!(await tx.warehouse.findUnique({ where: { id } }));
      const gone = () => NextResponse.json({ error: "가리킨 작업장 · 창고가 이 회사에 없습니다" }, { status: 404 });
      switch (b.kind) {
        case "workCenter": {
          const h = num(r.hoursPerDay);
          if (!code || !str(r.name, 40) || h === null || h <= 0 || h > 24) return bad("작업장: code(영숫자 20) · name · hoursPerDay(0~24)");
          return saveWorkCenter(tx, { code, name: str(r.name, 40)!, hoursPerDay: h });
        }
        case "machine":
          if (!code || !str(r.kind, 40) || typeof r.workCenterId !== "string" || !UUID_RE.test(r.workCenterId)) return bad("기계: code · kind · workCenterId");
          if (!(await wcOk(r.workCenterId))) return gone();
          return saveMachine(tx, { code, kind: str(r.kind, 40)!, workCenterId: r.workCenterId });
        case "worker":
          if (!code || !str(r.displayName, 40) || typeof r.skillGrade !== "string" || !MES_SKILL.test(r.skillGrade)) return bad("작업자: code · displayName(실명 금지 — 작업자 A …) · skillGrade(H2 처럼)");
          return saveWorker(tx, { code, displayName: str(r.displayName, 40)!, skillGrade: r.skillGrade });
        case "warehouse":
          if (!code || !str(r.name, 40)) return bad("창고: code · name · location(지역/창고/구역)");
          return saveWarehouse(tx, { code, name: str(r.name, 40)!, location: typeof r.location === "string" ? r.location.slice(0, 80) : "" });
        case "item": {
          const item = str(r.itemCode, 40), ms = num(r.minStack), ld = num(r.leadDays);
          if (!item || typeof r.warehouseId !== "string" || !UUID_RE.test(r.warehouseId) || ms === null || ms < 0 || ld === null || !Number.isInteger(ld) || ld < 0 || ld > 365 || (r.makeBuy !== "make" && r.makeBuy !== "buy"))
            return bad("품목 자재 정보: itemCode · warehouseId · minStack ≥ 0 · makeBuy(make|buy) · leadDays(0~365 정수)");
          if (!(await whOk(r.warehouseId))) return gone();
          return saveItemMaterial(tx, { itemCode: item, warehouseId: r.warehouseId, minStack: ms, supplier: str(r.supplier, 80), makeBuy: r.makeBuy, leadDays: ld, unit: str(r.unit, 10) ?? "ea" });
        }
        case "route": {
          const item = str(r.itemCode, 40);
          const steps = Array.isArray(r.steps) ? (r.steps as Record<string, unknown>[]) : [];
          if (!item || steps.length < 1 || steps.length > 20) return bad("공정 순서: itemCode · steps 1~20");
          const out = [];
          for (const s of steps) {
            const seq = num(s.seq), persons = num(s.persons), hours = num(s.hours), prev = s.prevSeq === null || s.prevSeq === undefined || s.prevSeq === "" ? null : num(s.prevSeq);
            if (seq === null || !Number.isInteger(seq) || seq < 1 || !str(s.name, 40) || typeof s.workCenterId !== "string" || !UUID_RE.test(s.workCenterId)
              || persons === null || !Number.isInteger(persons) || persons < 1 || typeof s.skill !== "string" || !MES_SKILL.test(s.skill) || hours === null || hours <= 0
              || (prev !== null && (!Number.isInteger(prev) || prev >= seq))) return bad("공정: seq · name · workCenterId · persons · skill(H2) · hours > 0 · prevSeq < seq");
            out.push({ seq, name: str(s.name, 40)!, workCenterId: s.workCenterId, persons, skill: s.skill, hours, prevSeq: prev });
          }
          if (new Set(out.map((x) => x.seq)).size !== out.length) return bad("공정 순번이 겹칩니다");
          for (const x of out) if (!(await wcOk(x.workCenterId))) return gone();
          return saveRoute(tx, item, out);
        }
        default:
          return bad("kind = workCenter | machine | worker | warehouse | item | route");
      }
    });
    if (out instanceof NextResponse) return out;
    return NextResponse.json({ ok: true, row: out });
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (/foreign key|violates foreign key|not found/i.test(m)) return NextResponse.json({ error: "가리킨 작업장 · 창고가 이 회사에 없습니다" }, { status: 404 });
    return mesError(e);
  }
}
