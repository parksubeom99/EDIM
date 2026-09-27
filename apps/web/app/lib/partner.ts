import type { TenantClient } from "@edim/db";
import { isUuid } from "@/app/lib/project-input";

/**
 * 0021 · Company DB — 보낸 partner id 가 이 회사의 그 종류(고객/공급처)인지 확인한다.
 *   undefined = 안 보냄(바꾸지 않음) · null = 비움("" 포함) · false = 잘못됨(없거나 다른 종류·다른 회사 — RLS 로 안 보인다)
 */
export async function partnerOk(tx: TenantClient, v: unknown, kind: "customer" | "supplier", keepId?: string | null): Promise<{ id: string; name: string; contact: string } | null | undefined | false> {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  if (!isUuid(v)) return false;
  const p = await tx.partner.findFirst({ where: { id: v as string, kind } });
  // 0024 · 사용 중지된 곳은 새로 가리킬 수 없다. 이미 가리키던 그 id 를 그대로 다시 보내는 것(다른 칸만 고친 저장)은 받는다.
  if (!p || (!p.active && p.id !== keepId)) return false;
  return { id: p.id, name: p.name, contact: p.contact };
}

/** 0024 · 그 고객·공급처를 가리키는 곳 수 — 하나라도 있으면 삭제 409. 구매 요청 줄은 공급처를 이름(스냅샷 글자)으로 갖는다. */
export async function partnerUsage(tx: TenantClient, p: { id: string; kind: string; name: string }): Promise<{ projects: number; prices: number; purchaseLines: number }> {
  const [projects, prices, purchaseLines] = await Promise.all([
    tx.project.count({ where: { clientId: p.id } }),
    tx.priceHistory.count({ where: { supplierId: p.id } }),
    p.kind === "supplier" ? tx.purchaseRequestLine.count({ where: { supplier: p.name } }) : Promise.resolve(0),
  ]);
  return { projects, prices, purchaseLines };
}
