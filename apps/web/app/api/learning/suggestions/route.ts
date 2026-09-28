import { NextResponse } from "next/server";
import { withTenant, listSuggestions } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { matchesCompanyFormat } from "@/app/lib/learning/similarity";
import { describeExpression } from "@/app/lib/learning/formula";

/**
 * B · 회사 Toolbox '학습 제안' — 플랫폼이 투영한 공식(착지 표 learned_suggestion · 회사별 RLS).
 * 원천 도면·특징은 없다(투영에서 빠지는 10%) — 식 · 목표 · 적합도 요약과, 이 회사 형식에 맞는지만.
 * 읽기는 viewer 도(목록 200) · 채택/숨기기는 [id] 에서 편집 권한.
 */
const GLOSS: Record<string, string> = { "DIM|L": "전장", "DIM|W": "전폭", "DIM|H": "전고", "DIM|SECSUM": "구획 길이 합", "DIM|SECTIONS": "구획 수", "DIM|LMAX": "가장 긴 구획" };

export async function GET() {
  const s = await getServerSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await withTenant(s.tenantId, (tx) => listSuggestions(tx));
  return NextResponse.json({
    rows: rows.map((r) => {
      const why = matchesCompanyFormat({ id: r.id, target: r.target, expression: r.expression });
      return { ...r, fitsCompany: why === null, why, plain: r.expression ? describeExpression(r.expression, GLOSS) : "" };
    }),
  });
}
