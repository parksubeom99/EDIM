import Link from "next/link";
import { getServerSession } from "@/app/lib/session";
import { getModule, canAccessModule } from "@/app/lib/modules";
import { CompanyAdmin } from "../company-admin";
import { Purchasing } from "../purchasing";
import { Register } from "../register";
import { ProjectManagement } from "../project-management";
import { canEditProject } from "@/app/lib/project-perms";

/**
 * Module routing stub (STEP 5). Guarded server-side: an unpermitted role sees a
 * forbidden notice, never module content. The 'project' module is the p12·p50
 * Project Management screen (등록 · 헤더 편집 · 영업 단계 · 접수 자료 File).
 *
 * P3-a: 'company' 모듈이 회사 관리자 영역이 된다 — User Management(2층→3층)와
 * 플랫폼 요청 통로(2층→1층). 역할 변경·의뢰 제출은 서버에서 owner 만 통과한다.
 */
export default async function ModulePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const session = await getServerSession();
  const mod = getModule(key);
  const allowed = !!session && !!mod && canAccessModule(session.role, key);

  return (
    <main style={{ maxWidth: key === "project" ? 1120 : key === "purchasing" || key === "register" ? 960 : 640, margin: "10vh auto", padding: 24 }}>
      <Link
        href="/"
        style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}
      >
        ← back to Main Form
      </Link>
      {allowed ? (
        <>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              marginTop: 16,
            }}
          >
            {mod!.label}
          </h1>
          {key === "register" ? (
            <Register />
          ) : key === "company" ? (
            <CompanyAdmin myRole={session!.role} />
          ) : key === "purchasing" ? (
            <Purchasing canEdit={canEditProject(session!.role)} />
          ) : key === "project" ? (
            <ProjectManagement canEdit={canEditProject(session!.role)} />
          ) : (
            <p style={{ color: "var(--ink-muted)" }}>
              여기에 {mod!.label} 워크플로우가 들어옵니다. (L3 — 범위 밖)
            </p>
          )}
        </>
      ) : (
        <>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              marginTop: 16,
              color: "var(--warn)",
            }}
          >
            403 — 접근 권한 없음
          </h1>
          <p style={{ color: "var(--ink-muted)" }}>
            현재 역할({session?.role ?? "?"})로는 이 모듈에 접근할 수 없습니다.
          </p>
        </>
      )}
    </main>
  );
}
