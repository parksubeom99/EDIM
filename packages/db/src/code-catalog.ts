import type { BomCodeRun, CodeRelationship, ProductCode, SubCode } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { TenantClient } from "./tenant";
import { requireTenant } from "./tenant";
import { writeAudit } from "./audit";

/**
 * P1 — BOM Code Set-Up persistence (EDIM.pdf p31 · p33 · p34) + BomCodeRun
 * snapshot. GAP1 (confirmed 2026-07-06): the BOM is code-based; BOM/BOMLine
 * live only as the snapshot a run leaves behind.
 *
 * This module stores and returns rows. It does not interpret them — the
 * engine (@edim/bom-code) is pure and lives outside the db package
 * (dependency rule: db → core-ontology only). JSON columns are therefore
 * typed `unknown`-ish here and validated at the API boundary.
 */
type Json = Prisma.InputJsonValue;

export interface CatalogRows {
  subCodes: SubCode[];
  productCodes: ProductCode[];
  relationships: CodeRelationship[];
}

export async function loadCatalogRows(tx: TenantClient): Promise<CatalogRows> {
  const [subCodes, productCodes, relationships] = await Promise.all([
    tx.subCode.findMany({ orderBy: [{ groupName: "asc" }, { itemKey: "asc" }, { seq: "asc" }] }),
    tx.productCode.findMany({ orderBy: { code: "asc" } }),
    tx.codeRelationship.findMany({ orderBy: [{ parentCode: "asc" }, { seq: "asc" }] }),
  ]);
  return { subCodes, productCodes, relationships };
}

export interface SubCodeInput {
  groupName: string;
  itemKey: string;
  itemName: string;
  value: string;
  description?: string;
  createdBy: string;
}

/** p31 — register one sub item; seq = next in its (group, item). */
export async function addSubCode(tx: TenantClient, input: SubCodeInput): Promise<SubCode> {
  const tenantId = await requireTenant(tx);
  const agg = await tx.subCode.aggregate({ _max: { seq: true }, where: { groupName: input.groupName, itemKey: input.itemKey } });
  const row = await tx.subCode.create({
    data: {
      tenantId,
      groupName: input.groupName,
      itemKey: input.itemKey,
      itemName: input.itemName,
      seq: (agg._max.seq ?? 0) + 1,
      value: input.value,
      description: input.description ?? "",
      createdBy: input.createdBy,
    },
  });
  await writeAudit(tx, input.createdBy, "create", "sub_code", row.id, null, { group: row.groupName, item: row.itemKey, value: row.value });
  return row;
}

export async function deleteSubCode(tx: TenantClient, id: string, actorId: string): Promise<boolean> {
  const before = await tx.subCode.findUnique({ where: { id } });
  if (!before) return false;
  await tx.subCode.delete({ where: { id } });
  await writeAudit(tx, actorId, "delete", "sub_code", id, { group: before.groupName, item: before.itemKey, value: before.value }, null);
  return true;
}

export interface ProductCodeInput {
  code: string;
  name: string;
  kind: "product" | "part" | "purchase";
  category?: string;
  unit?: string;
  specTemplate?: string;
  materialTemplate?: string;
  tables?: Json;
  sections?: Json | null;
  createdBy: string;
}

/** p33 — register or update a code (upsert by code). Table edits land here too. */
export async function upsertProductCode(tx: TenantClient, input: ProductCodeInput): Promise<ProductCode> {
  const tenantId = await requireTenant(tx);
  const before = await tx.productCode.findUnique({ where: { tenantId_code: { tenantId, code: input.code } } });
  const data = {
    name: input.name,
    kind: input.kind,
    category: input.category ?? "",
    unit: input.unit ?? "ea",
    specTemplate: input.specTemplate ?? "",
    materialTemplate: input.materialTemplate ?? "",
    tables: input.tables ?? {},
    /**
     * 구획 없음 = **빈 배열**로 저장한다. 예전에는 Prisma.DbNull 센티널을 썼는데,
     * @prisma/client 인스턴스가 둘이면(workspace 중복) 센티널을 못 알아보고 `{}` 가 저장돼
     * 그 코드가 카탈로그 검증에서 통째로 탈락했다(2026-09-23 실측 — 화면에서 저장하면 코드가 사라짐).
     * 배열은 센티널이 아니라 값이라 인스턴스와 무관하게 안전하다.
     */
    sections: input.sections ?? [],
  };
  const row = before
    ? await tx.productCode.update({ where: { id: before.id }, data: { ...data, updatedAt: new Date() } })
    : await tx.productCode.create({ data: { tenantId, code: input.code, createdBy: input.createdBy, ...data } });
  await writeAudit(tx, input.createdBy, before ? "update" : "create", "product_code", row.id,
    before ? { name: before.name, tables: before.tables } : null, { code: row.code, name: row.name, tables: row.tables });
  return row;
}

export interface RelationshipInput {
  parentCode: string;
  childCode: string;
  seq?: number;
  section: string;
  qty: Json;
  unitCost: Json;
  whenCond?: Json | null;
  remarks?: string | null;
  createdBy: string;
}

/** p34 — Add Child. seq defaults to max+10 so rows can be inserted between. */
export async function addRelationship(tx: TenantClient, input: RelationshipInput): Promise<CodeRelationship> {
  const tenantId = await requireTenant(tx);
  let seq = input.seq;
  if (seq === undefined) {
    const agg = await tx.codeRelationship.aggregate({ _max: { seq: true }, where: { parentCode: input.parentCode } });
    seq = (agg._max.seq ?? 0) + 10;
  }
  const row = await tx.codeRelationship.create({
    data: {
      tenantId,
      parentCode: input.parentCode,
      childCode: input.childCode,
      seq,
      section: input.section,
      qty: input.qty,
      unitCost: input.unitCost,
      whenCond: input.whenCond === undefined || input.whenCond === null ? Prisma.DbNull : input.whenCond,
      remarks: input.remarks ?? null,
      createdBy: input.createdBy,
    },
  });
  await writeAudit(tx, input.createdBy, "create", "code_relationship", row.id, null, { parent: row.parentCode, child: row.childCode, seq: row.seq });
  return row;
}

export async function deleteRelationship(tx: TenantClient, id: string, actorId: string): Promise<boolean> {
  const before = await tx.codeRelationship.findUnique({ where: { id } });
  if (!before) return false;
  await tx.codeRelationship.delete({ where: { id } });
  await writeAudit(tx, actorId, "delete", "code_relationship", id, { parent: before.parentCode, child: before.childCode, seq: before.seq }, null);
  return true;
}

export interface BomCodeRunInput {
  stableId?: string | null;
  code: string;
  slots: Json;
  macroValue?: number | null;
  parentCode: string;
  catalogFp: string;
  lines: Json;
  cost: Json;
  source?: string;
  /** P4-a — 이 실행이 근거로 삼은 코드 개정(없으면 null) */
  codeRevisionId?: string | null;
  /** P4-b — 이 값을 낸 승인 매크로(없으면 null). Tech Data 가 근거로 읽는다. */
  macroId?: string | null;
  macroRevision?: number | null;
  macroDsl?: string | null;
  /** 0011: 실행 시점 치수 스냅샷. */
  dims?: object | null;
  createdBy: string;
}

/** Snapshot of one run. Append-only (no UPDATE/DELETE grant on the table). */
export async function saveBomCodeRun(tx: TenantClient, input: BomCodeRunInput): Promise<BomCodeRun> {
  const tenantId = await requireTenant(tx);
  const row = await tx.bomCodeRun.create({
    data: {
      tenantId,
      hierarchyStable: input.stableId ?? null,
      code: input.code,
      slots: input.slots,
      macroValue: input.macroValue ?? null,
      parentCode: input.parentCode,
      catalogFp: input.catalogFp,
      lines: input.lines,
      cost: input.cost,
      source: input.source ?? "workbench",
      // P4-a: 어느 코드 개정으로 돌렸는지. 이 한 칸이 있어야 견적·도면에서
      // 거꾸로 Rev 까지 따라갈 수 있다(연결 장부 약함 #3).
      codeRevisionId: input.codeRevisionId ?? null,
      macroId: input.macroId ?? null,
      macroRevision: input.macroRevision ?? null,
      macroDsl: input.macroDsl ?? null,
      dims: (input.dims ?? undefined) as never,
      createdBy: input.createdBy,
    },
  });
  await tx.$executeRaw`
    INSERT INTO audit_log (tenant_id, actor_id, action, entity, entity_id, before, after)
    VALUES (current_setting('app.current_tenant')::uuid, ${input.createdBy}::uuid, 'bom.run', 'bom_code_run', ${row.id},
            NULL, ${JSON.stringify({ code: input.code, catalogFp: input.catalogFp })}::jsonb)`;
  return row;
}

export function listBomCodeRuns(tx: TenantClient, stableId: string | null, take = 10): Promise<BomCodeRun[]> {
  return tx.bomCodeRun.findMany({
    where: stableId ? { hierarchyStable: stableId } : {},
    orderBy: { createdAt: "desc" },
    take,
  });
}
