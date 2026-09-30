/**
 * seed-catalog.ts — P1 데모 카탈로그(BOM Code Set-Up) 시드.
 *
 * 원천: packages/bom-code/catalog/ahu-demo.json (Sub Code 18 · Product Code 16 ·
 * Code Relationship 39). 코드 의존이 아니라 데이터 파일로 읽는다
 * (의존 규칙 db → core-ontology 유지).
 *
 *  - seedCatalog()            : 테넌트 A에 Product Code가 하나도 없을 때만 넣는다(멱등 · 등록 내용 보존)
 *  - seedCatalog({force:true}): 지우고 다시 넣는다 — `db:reset:demo` 전용
 *    (시연 중 표를 고쳐 BOM이 바뀌는 장면을 보인 뒤 원상 복구).
 *
 * 수치는 샘플이다: M3 샘플 공식의 결과를 '등록된 표'로 1회 옮긴 것.
 * 회사 실 표(단가·규격)는 이 행들을 화면(Set-Up ▸ Product Code ▸ Table)에서 교체한다.
 * ccmd M — 또는 **파일만 바꿔서**(코드 수정 0): 읽는 순서 = 환경변수 EDIM_CATALOG(파일 경로)
 *   → packages/bom-code/catalog/catalog.local.json(회사 파일 자리 · .gitignore) → ahu-demo.json(샘플).
 *   바꾼 뒤 `pnpm db:reset:demo` 하면 반영된다(CAD 규칙서 · PCR 요율표와 같은 규칙).
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { adminPrisma } from "../src/client";
import { IDS } from "./seed";

interface DemoCatalog {
  subCodes: { group: string; itemKey: string; itemName: string; seq: number; value: string; description: string }[];
  productCodes: { code: string; name: string; kind: string; category: string; unit: string; specTemplate: string; materialTemplate: string; tables: object; sections?: object }[];
  relationships: { parent: string; child: string; seq: number; section: string; qty: object; unitCost: object; when?: object; remarks?: string }[];
  /** 0019 · p46 사양 항목(제품 코드별) */
  specItems?: Record<string, { key: string; label: string; unit: string; slot: string; source: object }[]>;
}

const here = dirname(fileURLToPath(import.meta.url));
const CATALOG_DIR = resolve(here, "../../bom-code/catalog");
/** 지금 읽을 카탈로그 파일 — 부를 때마다 고른다(환경변수 · 회사 파일 · 샘플 순) */
export function catalogPath(): string {
  if (process.env.EDIM_CATALOG) return resolve(process.env.EDIM_CATALOG);
  const local = resolve(CATALOG_DIR, "catalog.local.json");
  return existsSync(local) ? local : resolve(CATALOG_DIR, "ahu-demo.json");
}

export async function seedCatalog(opts: { force?: boolean } = {}): Promise<void> {
  const t = IDS.tenantA;
  const existing = await adminPrisma.productCode.count({ where: { tenantId: t } });
  const path = catalogPath();
  const cat = JSON.parse(readFileSync(path, "utf-8")) as DemoCatalog;
  if (!path.endsWith("ahu-demo.json")) console.log(`Catalog seed: 회사 카탈로그 파일 ${path} 을 읽습니다(샘플 대신).`);
  if (existing > 0 && !opts.force) {
    console.log(`Catalog seed: ${existing} product codes already registered — no-op.`);
    await seedSpecItems(cat, false);
    return;
  }
  await adminPrisma.$transaction(async (tx) => {
    await tx.codeRelationship.deleteMany({ where: { tenantId: t } });
    await tx.productCode.deleteMany({ where: { tenantId: t } });
    await tx.subCode.deleteMany({ where: { tenantId: t } });
    await tx.subCode.createMany({
      data: cat.subCodes.map((s) => ({ tenantId: t, groupName: s.group, itemKey: s.itemKey, itemName: s.itemName, seq: s.seq, value: s.value, description: s.description, createdBy: IDS.ownerA })),
    });
    await tx.productCode.createMany({
      data: cat.productCodes.map((p) => ({
        tenantId: t, code: p.code, name: p.name, kind: p.kind, category: p.category, unit: p.unit,
        specTemplate: p.specTemplate, materialTemplate: p.materialTemplate, tables: p.tables,
        ...(p.sections ? { sections: p.sections } : {}), createdBy: IDS.ownerA,
      })),
    });
    await tx.codeRelationship.createMany({
      data: cat.relationships.map((r) => ({
        tenantId: t, parentCode: r.parent, childCode: r.child, seq: r.seq, section: r.section,
        qty: r.qty, unitCost: r.unitCost, ...(r.when ? { whenCond: r.when } : {}), remarks: r.remarks ?? null, createdBy: IDS.ownerA,
      })),
    });
  });
  console.log(`Catalog seed: ${cat.subCodes.length} sub codes · ${cat.productCodes.length} product codes · ${cat.relationships.length} relationships.`);
  await seedSpecItems(cat, true);
}

/**
 * 0019 · p46 사양 항목. 없을 때만 넣는다(이미 카탈로그가 있는 DB 에 마이그레이션만 올린 경우도 채운다).
 * force(= db:reset:demo)면 리허설이 더한 항목을 지우고 시드 상태로 되돌린다.
 */
async function seedSpecItems(cat: DemoCatalog, force: boolean): Promise<void> {
  const t = IDS.tenantA;
  const items = Object.entries(cat.specItems ?? {});
  if (force) await adminPrisma.specItem.deleteMany({ where: { tenantId: t } });
  else if ((await adminPrisma.specItem.count({ where: { tenantId: t } })) > 0) return;
  let n = 0;
  for (const [productCode, list] of items) {
    await adminPrisma.specItem.createMany({
      data: list.map((x, i) => ({ tenantId: t, productCode, seq: i + 1, key: x.key, label: x.label, unit: x.unit, slot: x.slot, source: x.source, createdBy: IDS.ownerA })),
    });
    n += list.length;
  }
  console.log(`Spec items seed: ${n} (p46).`);
}

const isMain = process.argv[1]?.endsWith("seed-catalog.ts") ?? false;
if (isMain) {
  seedCatalog({ force: process.argv.includes("--force") })
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
