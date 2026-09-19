import { getServerSession } from "@/app/lib/session";
import { getTreeForSession } from "@/app/lib/hierarchy";
import { getProjectDetailByStable } from "@/app/lib/project";
import { modulesForRole } from "@/app/lib/modules";
import { canEditProject, canDecideApproval } from "@/app/lib/project-perms";
import { derivePipeline } from "@/app/lib/approval-state";
import { MainFormShell, type WorkbenchProject } from "./mainform-shell";
import { withTenant, getCurrentRevision, revLabel } from "@edim/db";
import type { SlotValues } from "@/app/lib/rccs";
import { loadSlotDefs } from "@/app/lib/catalog";

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
  // Tier B: the node's current assembled code (highest rev) seeds the Code Builder.
  const current = node && session ? await withTenant(session.tenantId, (tx) => getCurrentRevision(tx, node)) : null;
  // P1: Code Builder choices = the tenant's registered Sub Codes (p31), not constants.
  const slotDefs = session ? await loadSlotDefs(session.tenantId) : undefined;
  const initialSlots = (current?.slots as SlotValues | undefined) ?? null;
  const initialRev = current ? { revNo: current.revNo, rev: revLabel(current.revNo), code: current.code } : null;

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
      slotDefs={slotDefs}
      initialSlots={initialSlots}
      initialRev={initialRev}
      project={project}
      canEdit={session ? canEditProject(session.role) : false}
      canDecide={session ? canDecideApproval(session.role) : false}
    />
  );
}
