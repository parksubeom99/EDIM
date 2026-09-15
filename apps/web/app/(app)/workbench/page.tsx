import { getServerSession } from "@/app/lib/session";
import { getTreeForSession } from "@/app/lib/hierarchy";
import { getProjectDetailByStable } from "@/app/lib/project";
import { modulesForRole } from "@/app/lib/modules";
import { canEditProject, canDecideApproval } from "@/app/lib/project-perms";
import { derivePipeline } from "@/app/lib/approval-state";
import { MainFormShell, type WorkbenchProject } from "./mainform-shell";

/**
 * EDIM MainForm workbench (p56 · 5 regions): Toolbar(3 tiers) · Work Hierarchy ·
 * Main/Sub/Key Work Place · Inspector · Action Bar. Server-rendered under the
 * session's RLS; the selected node (?node=<stable>) drives project + approvals.
 */
export default async function WorkbenchPage({
  searchParams,
}: {
  searchParams: Promise<{ node?: string }>;
}) {
  const session = await getServerSession();
  const tree = (await getTreeForSession()) ?? [];
  const { node } = await searchParams;
  const detail = node ? await getProjectDetailByStable(node) : null;

  const project: WorkbenchProject | null = detail
    ? {
        id: detail.project.id,
        projectNo: detail.project.projectNo,
        name: detail.project.name,
        type: detail.project.type,
        clientName: detail.project.clientName,
        clientContact: detail.project.clientContact,
        itemType: detail.project.itemType,
        salesStage: detail.project.salesStage,
        status: detail.project.status,
        tasks: detail.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          state: t.state,
          dueAt: t.dueAt ? t.dueAt.toISOString() : null,
        })),
        attachments: detail.attachments.map((a) => ({
          id: a.id,
          department: a.department,
          docType: a.docType,
          name: a.name,
          description: a.description,
          uploadedAt: a.uploadedAt.toISOString(),
        })),
        approvals: detail.approvals.map((a) => ({
          id: a.id,
          state: a.state,
          note: a.note,
          requestedAt: a.requestedAt.toISOString(),
        })),
        pipeline: derivePipeline(
          detail.approvals.map((a) => ({
            id: a.id,
            state: a.state,
            note: a.note,
            requestedAt: a.requestedAt,
          })),
        ),
      }
    : null;

  return (
    <MainFormShell
      session={
        session
          ? {
              email: session.email,
              role: session.role,
              tenantId: session.tenantId,
            }
          : null
      }
      modules={session ? modulesForRole(session.role) : []}
      tree={tree}
      selectedNode={node ?? null}
      project={project}
      canEdit={session ? canEditProject(session.role) : false}
      canDecide={session ? canDecideApproval(session.role) : false}
    />
  );
}
