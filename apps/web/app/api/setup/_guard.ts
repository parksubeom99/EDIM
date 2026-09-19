import { NextResponse } from "next/server";
import { getServerSession } from "@/app/lib/session";
import { canEditCatalog } from "@/app/lib/catalog";

type Session = NonNullable<Awaited<ReturnType<typeof getServerSession>>>;

/** Read = any signed-in role · write = owner/engineer (server-side, not just hidden buttons). */
export async function guard(write: boolean): Promise<{ session: Session } | { res: NextResponse }> {
  const session = await getServerSession();
  if (!session) return { res: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  if (write && !canEditCatalog(session.role)) return { res: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  return { session };
}

export const str = (v: unknown, max = 200): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Unique / FK / CHECK violations from Postgres → 409 with a readable reason. */
export function dbError(e: unknown): NextResponse {
  const msg = e instanceof Error ? e.message : String(e);
  const reason = /Unique constraint|unique/i.test(msg) ? "이미 등록된 값입니다"
    : /Foreign key|foreign/i.test(msg) ? "등록되지 않은 코드를 가리키거나, 관계에서 쓰이는 코드입니다"
    : /check constraint|no_self/i.test(msg) ? "허용되지 않는 값입니다"
    : "저장 실패";
  return NextResponse.json({ error: reason }, { status: 409 });
}
