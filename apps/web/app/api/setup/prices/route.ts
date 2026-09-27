import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit, requireTenant } from "@edim/db";
import { guard, str } from "../_guard";
import { partnerOk } from "@/app/lib/partner";
import { businessToday, dateOnly } from "@/app/lib/today";
import { currentByItem } from "@/app/lib/price";

/**
 * p32 G:Price · p67 단가 이력. GET ?code= → 그 코드의 이력(최근 유효일 먼저) + 품목별 현재 단가.
 * POST { code, item?, price, currency?, supplier?, supplierId?, effectiveFrom(YYYY-MM-DD), note? } → 새 행을 쌓는다(고치기 없음).
 *   supplierId(0021 · Company DB 공급처)를 보내면 글자 supplier 가 비었을 때 그 이름으로 채운다.
 * 현재 단가 = 오늘까지 유효한 가장 최근 행. 미래 유효일 행은 "예정"으로 보인다.
 */
const CURRENCIES = ["KRW", "USD", "EUR", "JPY", "CNY"];
const today = () => businessToday();   // 회사 시간대의 오늘 — UTC 로 자르면 KST 00~09시에 어제가 된다

export async function GET(req: NextRequest) {
  const g = await guard(false);
  if ("res" in g) return g.res;
  const code = new URL(req.url).searchParams.get("code") ?? "";
  if (!code) return NextResponse.json({ error: "code 필수" }, { status: 400 });
  const rows = await withTenant(g.session.tenantId, (tx) =>
    tx.priceHistory.findMany({ where: { code }, orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }] }));
  const t = today();
  const view = rows.map((r) => ({ id: r.id, item: r.item, price: Number(r.price), currency: r.currency, supplier: r.supplier, supplierId: r.supplierId,
    effectiveFrom: dateOnly(r.effectiveFrom), note: r.note, createdAt: r.createdAt }));
  const current = currentByItem(view, t);   // "현재 단가" 판정 한 곳 — BOM Run 도 같은 함수(app/lib/price.ts)
  return NextResponse.json({ rows: view.map((r) => ({ ...r, state: r.effectiveFrom > t ? "예정" : current[r.item]?.id === r.id ? "현재" : "지난" })), current });
}

export async function POST(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const code = str(b.code, 40), item = str(b.item, 40), supplier = str(b.supplier, 80), note = str(b.note, 200);
  const price = Number(b.price), currency = str(b.currency, 3) || "KRW", eff = str(b.effectiveFrom, 10);
  if (!code) return NextResponse.json({ error: "code 필수" }, { status: 400 });
  if (!Number.isFinite(price) || price <= 0 || price >= 1e12) return NextResponse.json({ error: "단가는 0 보다 커야 합니다" }, { status: 400 });
  if (!CURRENCIES.includes(currency)) return NextResponse.json({ error: `통화는 ${CURRENCIES.join("·")}` }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eff) || Number.isNaN(Date.parse(eff))) return NextResponse.json({ error: "유효일은 YYYY-MM-DD" }, { status: 400 });
  const out = await withTenant(g.session.tenantId, async (tx) => {
    if (!(await tx.productCode.findFirst({ where: { code } }))) return null;   // 등록된 코드에만 단가를 단다
    const sp = await partnerOk(tx, b.supplierId, "supplier");
    if (sp === false) return "badSupplier" as const;
    const tenantId = await requireTenant(tx);
    const sup = supplier || sp?.name || "";
    const row = await tx.priceHistory.create({ data: { tenantId, code, item, price, currency, supplier: sup, supplierId: sp?.id ?? null, effectiveFrom: new Date(eff + "T00:00:00Z"), note: note || null, createdBy: g.session.userId } });
    await writeAudit(tx, g.session.userId, "create", "price_history", row.id, null, { code, item, price, currency, supplier: sup, supplierId: sp?.id ?? null, effectiveFrom: eff });
    return row.id;
  });
  if (!out) return NextResponse.json({ error: `등록되지 않은 코드: ${code}` }, { status: 404 });
  if (out === "badSupplier") return NextResponse.json({ error: "공급처는 Company DB 의 이 회사 공급처여야 합니다" }, { status: 400 });
  return NextResponse.json({ ok: true, id: out });
}
