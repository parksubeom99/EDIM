import { NextResponse } from "next/server";
import { getPlatformSession } from "@/app/lib/platform-session";
import { getServerSession } from "@/app/lib/session";

/** 학습 API 는 플랫폼 관리자 전용 — 세션 없음 401 · 회사 계정 403(DB① 은 회사가 읽지도 쓰지도 못한다). */
export async function requirePlatform(): Promise<{ userId: string } | NextResponse> {
  const p = await getPlatformSession();
  if (p) return { userId: p.userId };
  const t = await getServerSession();
  return NextResponse.json({ error: t ? "플랫폼 관리자 전용입니다(DB①)" : "unauthorized" }, { status: t ? 403 : 401 });
}
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
