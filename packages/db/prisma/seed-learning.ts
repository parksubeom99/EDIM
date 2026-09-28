import { readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { adminPrisma } from "../src/client";

/**
 * 0033 · B 샘플 학습 자료(DB①) — packages/db/prisma/learning-samples/SAMPLE_* 를 platform.learning_source 에 넣는다.
 * 전부 **샘플**(is_sample · origin 'sample') — 실제 회사 도면이 아니다. 만드는 법: scripts/make_learning_samples.ts.
 * 같은 파일(sha256)은 두 번 들어가지 않는다 → reset 뒤에도, 여러 번 돌려도 같은 상태.
 */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, "learning-samples");

export async function seedLearning(): Promise<number> {
  let n = 0;
  for (const f of readdirSync(DIR).filter((x) => x.startsWith("SAMPLE_")).sort()) {
    const content = readFileSync(path.join(DIR, f));
    const sha = createHash("sha256").update(content).digest("hex");
    const kind = f.endsWith(".csv") ? "techdoc" : "drawing";
    n += await adminPrisma.$executeRaw`
      INSERT INTO platform.learning_source (kind, title, note, origin, is_sample, content, sha256, byte_size)
      VALUES (${kind}, ${f}, '샘플 — 실제 회사 자료 아님', 'sample', true, ${content}, ${sha}, ${content.length})
      ON CONFLICT (sha256) DO NOTHING`;
  }
  return n;
}

/** 학습 작업 흔적 지우기(reset) — 작업(단계·특징·공식·투영 기록 cascade) · 착지 표 · 샘플이 아닌 업로드. 샘플은 남긴다. */
export async function resetLearning(): Promise<void> {
  await adminPrisma.$executeRaw`DELETE FROM public.learned_suggestion`;
  await adminPrisma.$executeRaw`DELETE FROM platform.learning_job`;
  await adminPrisma.$executeRaw`DELETE FROM platform.learning_source WHERE NOT is_sample`;
  await adminPrisma.$executeRaw`UPDATE platform.learning_source SET monitor = NULL`;
}
