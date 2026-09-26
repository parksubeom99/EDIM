import type { TenantClient } from "@edim/db";
import { isUuid } from "@/app/lib/project-input";

/**
 * 0021 · Company DB — 보낸 partner id 가 이 회사의 그 종류(고객/공급처)인지 확인한다.
 *   undefined = 안 보냄(바꾸지 않음) · null = 비움("" 포함) · false = 잘못됨(없거나 다른 종류·다른 회사 — RLS 로 안 보인다)
 */
export async function partnerOk(tx: TenantClient, v: unknown, kind: "customer" | "supplier"): Promise<{ id: string; name: string; contact: string } | null | undefined | false> {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  if (!isUuid(v)) return false;
  const p = await tx.partner.findFirst({ where: { id: v as string, kind } });
  return p ? { id: p.id, name: p.name, contact: p.contact } : false;
}
