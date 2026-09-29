/**
 * seed-symbols.ts — ccmd K · KC-3 · p58 설계 심볼 라이브러리 샘플(0036).
 * 원천: packages/bom-code/cad-rules/symbols.sample.json — 팬 · 모터 · 필터 · 코일 · 댐퍼(단순 기하 도형 · is_sample).
 * 두 데모 회사에 같은 샘플을 넣는다(회사마다 자기 행 · RLS). 멱등: key 가 같으면 모양 · 이름만 맞춘다.
 * 앱 역할(edim_app)은 design_symbol 에 SELECT 만 있다 — 그래서 스키마 소유자(adminPrisma)로 넣는다.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { adminPrisma } from "../src/client";
import { IDS } from "./seed";

const here = dirname(fileURLToPath(import.meta.url));
const PATH = resolve(here, "../../bom-code/cad-rules/symbols.sample.json");

export async function seedSymbols(): Promise<void> {
  const lib = JSON.parse(readFileSync(PATH, "utf-8")) as { symbols: { key: string; name: string; primitives: object[] }[] };
  for (const tenantId of [IDS.tenantA, IDS.tenantB]) {
    for (const s of lib.symbols) {
      await adminPrisma.designSymbol.upsert({
        where: { tenantId_key: { tenantId, key: s.key } },
        create: { tenantId, key: s.key, name: s.name, primitives: s.primitives, isSample: true },
        update: { name: s.name, primitives: s.primitives, isSample: true },
      });
    }
  }
  console.log(`Symbol seed: ${lib.symbols.length} sample design symbols × 2 tenants (p58).`);
}
