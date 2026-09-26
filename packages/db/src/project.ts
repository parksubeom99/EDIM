import type {
  ProjectType,
  SalesStage,
  TaskState,
  ApprovalState,
} from "@edim/core-ontology";
import type { TenantClient } from "./tenant";
import { requireTenant } from "./tenant";
import { writeAudit } from "./audit";
import { createNode } from "./hierarchy";

/**
 * Project domain (handoff §3.1 / STEP A1). Follows the hierarchy.ts pattern:
 * every function runs inside a withTenant() tx (RLS auto-scopes to the tenant),
 * and every mutation records an audit_log row.
 *
 * A Project is the detail table for a Hierarchy node of kind='project'
 * (Hierarchy = address, table = detail). createProject creates both: the node
 * (so it appears in the tree) and the project row (attributes), linked by
 * hierarchy_stable = the node's stable_id.
 */

export interface CreateProjectInput {
  parentStable: string | null; // where the project node hangs in the tree
  projectNo: string;
  name: string;
  type: ProjectType;
  clientName?: string | null;
  clientContact?: string | null;
  /** 0021 · Company DB 고객 id (client_name 글자 열과 함께 채운다) */
  clientId?: string | null;
  itemType?: string | null;
  salesStage?: SalesStage;
  createdBy: string;
}

export async function createProject(
  tx: TenantClient,
  input: CreateProjectInput,
): Promise<{ id: string; hierarchyStable: string }> {
  const tenantId = await requireTenant(tx);

  // 1) tree node (kind='project') so the project is addressable in the rail
  const hierarchyStable = await createNode(tx, {
    parentStable: input.parentStable,
    kind: "project",
    label: `${input.projectNo} ${input.name}`,
    createdBy: input.createdBy,
  });

  // 2) detail row
  const project = await tx.project.create({
    data: {
      tenantId,
      hierarchyStable,
      projectNo: input.projectNo,
      name: input.name,
      type: input.type,
      clientName: input.clientName ?? null,
      clientContact: input.clientContact ?? null,
      clientId: input.clientId ?? null,
      itemType: input.itemType ?? null,
      salesStage: input.salesStage ?? "기술제안",
      status: "active",
      createdBy: input.createdBy,
    },
  });

  await writeAudit(tx, input.createdBy, "create", "project", project.id, null, {
    projectNo: input.projectNo,
    name: input.name,
    type: input.type,
    salesStage: project.salesStage,
  });
  return { id: project.id, hierarchyStable };
}

export function getProject(tx: TenantClient, id: string) {
  return tx.project.findUnique({ where: { id } });
}

/** Look up a project by its hierarchy node stable_id (rail click → detail). */
export function getProjectByStable(tx: TenantClient, hierarchyStable: string) {
  return tx.project.findFirst({ where: { hierarchyStable } });
}

export function listProjects(tx: TenantClient) {
  return tx.project.findMany({ orderBy: { createdAt: "asc" } });
}

export interface UpdateProjectPatch {
  name?: string;
  type?: ProjectType;
  clientName?: string | null;
  clientContact?: string | null;
  /** 0021 · Company DB 고객 id */
  clientId?: string | null;
  itemType?: string | null;
  /** 0014 · p12 담당자 · Remarks · Description */
  ownerId?: string | null;
  remarks?: string | null;
  description?: string | null;
}

export async function updateProject(
  tx: TenantClient,
  id: string,
  patch: UpdateProjectPatch,
  actorId: string,
): Promise<void> {
  const before = await tx.project.findUniqueOrThrow({ where: { id } });
  const after = await tx.project.update({ where: { id }, data: patch });
  await writeAudit(
    tx,
    actorId,
    "update",
    "project",
    id,
    {
      name: before.name,
      type: before.type,
      clientName: before.clientName,
      clientContact: before.clientContact,
      clientId: before.clientId,
      itemType: before.itemType,
      ownerId: before.ownerId,
      remarks: before.remarks,
      description: before.description,
    },
    {
      name: after.name,
      type: after.type,
      clientName: after.clientName,
      clientContact: after.clientContact,
      clientId: after.clientId,
      itemType: after.itemType,
      ownerId: after.ownerId,
      remarks: after.remarks,
      description: after.description,
    },
  );
}

export async function setSalesStage(
  tx: TenantClient,
  id: string,
  stage: SalesStage,
  actorId: string,
): Promise<void> {
  const before = await tx.project.findUniqueOrThrow({ where: { id } });
  await tx.project.update({ where: { id }, data: { salesStage: stage } });
  await writeAudit(
    tx,
    actorId,
    "update",
    "project",
    id,
    { salesStage: before.salesStage },
    { salesStage: stage },
  );
}

export async function closeProject(
  tx: TenantClient,
  id: string,
  actorId: string,
): Promise<void> {
  const before = await tx.project.findUniqueOrThrow({ where: { id } });
  await tx.project.update({ where: { id }, data: { status: "closed" } });
  await writeAudit(
    tx,
    actorId,
    "update",
    "project",
    id,
    { status: before.status },
    { status: "closed" },
  );
}

// --- Tasks (Schedule) -------------------------------------------------------

export function listTasks(tx: TenantClient, projectId: string) {
  return tx.projectTask.findMany({
    where: { projectId },
    orderBy: [{ state: "asc" }, { createdAt: "asc" }],
  });
}

export async function addTask(
  tx: TenantClient,
  projectId: string,
  title: string,
  dueAt: Date | null,
  actorId: string,
): Promise<string> {
  const tenantId = await requireTenant(tx);
  const task = await tx.projectTask.create({
    data: { tenantId, projectId, title, state: "todo", dueAt },
  });
  await writeAudit(tx, actorId, "create", "project_task", task.id, null, {
    projectId,
    title,
    state: "todo",
  });
  return task.id;
}

export async function setTaskState(
  tx: TenantClient,
  taskId: string,
  state: TaskState,
  actorId: string,
): Promise<void> {
  const before = await tx.projectTask.findUniqueOrThrow({
    where: { id: taskId },
  });
  await tx.projectTask.update({ where: { id: taskId }, data: { state } });
  await writeAudit(
    tx,
    actorId,
    "update",
    "project_task",
    taskId,
    { state: before.state },
    { state },
  );
}

// --- Attachments (Data Up-Load; metadata only) ------------------------------

export function listAttachments(tx: TenantClient, projectId: string) {
  return tx.projectAttachment.findMany({
    where: { projectId },
    orderBy: [{ department: "asc" }, { uploadedAt: "desc" }],
  });
}

export interface AddAttachmentInput {
  projectId: string;
  department: string;
  docType: string;
  name: string;
  description?: string | null;
  fileRef: string;
  fileMime?: string | null;
  fileSize?: number | null;
  uploadedBy: string;
}

export async function addAttachment(
  tx: TenantClient,
  input: AddAttachmentInput,
): Promise<string> {
  const tenantId = await requireTenant(tx);
  const att = await tx.projectAttachment.create({
    data: {
      tenantId,
      projectId: input.projectId,
      department: input.department,
      docType: input.docType,
      name: input.name,
      description: input.description ?? null,
      fileRef: input.fileRef,
      fileMime: input.fileMime ?? null,
      fileSize: input.fileSize ?? null,
      uploadedBy: input.uploadedBy,
    },
  });
  await writeAudit(
    tx,
    input.uploadedBy,
    "create",
    "project_attachment",
    att.id,
    null,
    {
      projectId: input.projectId,
      department: input.department,
      name: input.name,
    },
  );
  return att.id;
}

// --- Approvals --------------------------------------------------------------

export function listApprovals(tx: TenantClient, projectId: string) {
  return tx.projectApproval.findMany({
    where: { projectId },
    orderBy: { requestedAt: "desc" },
    // P6: 무엇을 승인했는지 — 묶인 BOM 스냅샷의 코드를 함께 돌려준다.
    include: { bomRun: { select: { code: true } } },
  });
}

export class ApprovalBindingError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "ApprovalBindingError";
  }
}

/**
 * P6 — 승인은 **BOM 스냅샷에 대해** 요청한다.
 * 스냅샷은 코드 개정·매크로 개정·카탈로그 지문을 품고 있으므로, 승인이 스냅샷에 묶이면
 * "무엇을 승인했는가"가 그 셋까지 한 번에 정해진다. 묶인 뒤에는 바꿀 수 없다(DB 트리거).
 *  - 스냅샷은 이 프로젝트의 노드에서 돌린 것이어야 한다.
 *  - 플랫폼 단계(tier:platform) 요청은 **조직 승인을 받은 바로 그 스냅샷**이어야 한다.
 */
export async function requestApproval(
  tx: TenantClient,
  projectId: string,
  requesterId: string,
  note: string | null,
  bomRunId: string,
): Promise<string> {
  const tenantId = await requireTenant(tx);
  const project = await tx.project.findUnique({ where: { id: projectId } });
  if (!project) throw new ApprovalBindingError(404, "프로젝트를 찾을 수 없습니다");
  const run = await tx.bomCodeRun.findUnique({ where: { id: bomRunId } });
  if (!run) throw new ApprovalBindingError(404, "BOM 스냅샷을 찾을 수 없습니다");
  if (run.hierarchyStable !== project.hierarchyStable)
    throw new ApprovalBindingError(422, "이 BOM 스냅샷은 이 프로젝트에서 실행한 것이 아닙니다");
  if ((note ?? "").startsWith("tier:platform")) {
    const org = await tx.projectApproval.findFirst({
      where: { projectId, note: { startsWith: "tier:org" } },
      orderBy: { requestedAt: "desc" },
    });
    if (!org || org.state !== "approved" || org.bomRunId !== bomRunId)
      throw new ApprovalBindingError(409, "조직 승인을 받은 BOM 스냅샷과 다릅니다 — 같은 스냅샷으로 올려야 합니다");
  }
  const ap = await tx.projectApproval.create({
    data: { tenantId, projectId, requesterId, state: "requested", note, bomRunId },
  });
  await writeAudit(tx, requesterId, "create", "project_approval", ap.id, null, {
    projectId,
    state: "requested",
    bomRunId,
    code: run.code,
    codeRevisionId: run.codeRevisionId,
    macroRevision: run.macroRevision,
  });
  return ap.id;
}

/** Approve/reject. Caller is responsible for the RBAC gate (see app guards). */
export async function decideApproval(
  tx: TenantClient,
  approvalId: string,
  decision: Extract<ApprovalState, "approved" | "rejected">,
  approverId: string,
  note: string | null,
): Promise<void> {
  const before = await tx.projectApproval.findUniqueOrThrow({
    where: { id: approvalId },
  });
  if (before.state !== "requested")
    throw new ApprovalBindingError(409, `이미 결정된 승인입니다 (${before.state})`);
  // 단계 표식(tier:org / tier:platform)은 요청 때 붙은 것이다. 결정 메모가 그것을 지우지 못하게 한다
  // — 표식이 사라지면 "이 BOM 은 승인됐는가"(0010 bom_run_is_approved)가 승인을 못 알아본다.
  const tier = /^tier:(org|platform)/.exec(before.note ?? "")?.[0];
  if (tier && !(note ?? "").startsWith(tier)) note = `${tier} · ${note ?? decision}`;
  await tx.projectApproval.update({
    where: { id: approvalId },
    data: { state: decision, approverId, note, decidedAt: new Date() },
  });
  await writeAudit(
    tx,
    approverId,
    "update",
    "project_approval",
    approvalId,
    { state: before.state },
    { state: decision },
  );
}
