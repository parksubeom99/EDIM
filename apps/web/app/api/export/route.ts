import { NextResponse, type NextRequest } from "next/server";
import { withTenantSession } from "@edim/auth";
import {
  getProject,
  listTasks,
  listAttachments,
  listApprovals,
} from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { derivePipeline } from "@/app/lib/approval-state";

/** Export (p62) — real: the selected project's full detail as a JSON download. */
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const projectId = req.nextUrl.searchParams.get("project");
  const code = req.nextUrl.searchParams.get("code");
  if (!projectId)
    return NextResponse.json({ error: "project required" }, { status: 400 });

  const data = await withTenantSession(session, async (tx) => {
    const project = await getProject(tx, projectId);
    if (!project) return null;
    const [tasks, attachments, approvals] = await Promise.all([
      listTasks(tx, project.id),
      listAttachments(tx, project.id),
      listApprovals(tx, project.id),
    ]);
    return { project, tasks, attachments, approvals };
  });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  const payload = {
    exportedAt: new Date().toISOString(),
    exportedBy: session.email,
    rccsCode: code ?? null,
    pipeline: derivePipeline(data.approvals).stage,
    ...data,
  };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="edim-${data.project.projectNo}.json"`,
    },
  });
}
