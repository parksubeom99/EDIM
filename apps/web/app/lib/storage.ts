import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * 0014 · 접수 자료(File) 저장소. 파일 본체는 DB 가 아니라 서버 디스크에 두고 DB 행의 file_ref 가 가리킨다.
 * 운영에서는 EDIM_STORAGE_DIR 을 영속 볼륨으로 잡는다(기본: 앱 폴더의 .storage — git 에서 제외).
 * 키는 테넌트 폴더 아래 UUID 뿐이라 사용자가 준 이름이 경로에 들어가지 않는다.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ROOT = () => process.env.EDIM_STORAGE_DIR ?? path.join(process.cwd(), ".storage");
const KEY = /^local:([0-9a-f-]{36})\/([0-9a-f-]{36})$/;

export async function putFile(tenantId: string, id: string, bytes: Buffer): Promise<string> {
  const dir = path.join(ROOT(), tenantId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, id), bytes);
  return `local:${tenantId}/${id}`;
}

/** file_ref 가 이 테넌트의 실제 파일을 가리킬 때만 읽는다(다른 테넌트 키·옛 메타데이터 행은 null). */
export async function getFile(tenantId: string, fileRef: string): Promise<Buffer | null> {
  const m = KEY.exec(fileRef);
  if (!m || m[1] !== tenantId) return null;
  try { return await readFile(path.join(ROOT(), m[1], m[2]!)); } catch { return null; }
}
