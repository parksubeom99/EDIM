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
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { adminPrisma } from "../src/client";
import { IDS } from "./seed";

interface DemoCatalog {
  subCodes: { group: string; itemKey: string; itemName: string; seq: number; value: string; description: string }[];
  productCodes: { code: string; name: string; kind: string; category: string; unit: string; specTemplate: string; materialTemplate: string; tables: object; sections?: object }[];
  relationships: { parent: string; child: string; seq: number; section: string; qty: object; unitCost: object; when?: object; remarks?: string }[];
}

const here = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = resolve(here, "../../bom-code/catalog/ahu-demo.json");

export async function seedCatalog(opts: { force?: boolean } = {}): Promise<void> {
  const t = IDS.tenantA;
  const existing = await adminPrisma.productCode.count({ where: { tenantId: t } });
  if (existing > 0 && !opts.force) {
    console.log(`Catalog seed: ${existing} product codes already registered — no-op.`);
    return;
  }
  const cat = JSON.parse(readFileSync(CATALOG_PATH, "utf-8")) as DemoCatalog;
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
