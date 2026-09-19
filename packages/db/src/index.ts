/**
 * @edim/db — schema, Prisma client, and RLS plumbing.
 *
 * Dependency rule: db → core-ontology only.
 *
 * STEP 1 surface: the two-trust-level clients and the tenant-scoped transaction
 * wrapper that makes Postgres RLS the real defense line. Hierarchy CRUD + the
 * recursive-CTE tree query arrive in STEP 3.
 */
export const DB_PACKAGE = "@edim/db" as const;

export { adminPrisma, appPrisma, platformDb, Prisma } from "./client";
export type { PrismaClient } from "./client";
export { withTenant, currentTenantOf, requireTenant } from "./tenant";
export type { TenantClient } from "./tenant";
export {
  getTree,
  getTreeRows,
  createNode,
  renameNode,
  moveNode,
  softDeleteNode,
} from "./hierarchy";
export type { CreateNodeInput } from "./hierarchy";
export {
  createDraft,
  approve,
  reject,
  getMacro,
  listForNode,
  getApproved,
} from "./macro";
export type { MacroDraftInput, MacroApproveInput, MacroRejectInput } from "./macro";
export { writeAudit, type AuditAction } from "./audit";
export {
  createProject,
  getProject,
  getProjectByStable,
  listProjects,
  updateProject,
  setSalesStage,
  closeProject,
  listTasks,
  addTask,
  setTaskState,
  listAttachments,
  addAttachment,
  listApprovals,
  requestApproval,
  decideApproval,
} from "./project";
export type {
  CreateProjectInput,
  UpdateProjectPatch,
  AddAttachmentInput,
} from "./project";
export { listRevisions, getCurrentRevision, saveRevision, revLabel } from "./code-revision";
export type { SaveRevisionInput } from "./code-revision";
export {
  loadCatalogRows,
  addSubCode,
  deleteSubCode,
  upsertProductCode,
  addRelationship,
  deleteRelationship,
  saveBomCodeRun,
  listBomCodeRuns,
} from "./code-catalog";
export type {
  CatalogRows,
  SubCodeInput,
  ProductCodeInput,
  RelationshipInput,
  BomCodeRunInput,
} from "./code-catalog";
export {
  findPlatformAdmin,
  platformAdminByEmail,
  listTenantsForPlatform,
  listPlatformRequests,
  decidePlatformRequest,
  platformDbStatus,
  createPlatformRequest,
  listPlatformRequestsForTenant,
} from "./platform";
export type {
  PlatformAdmin,
  PlatformTenantRow,
  PlatformRequestRow,
  PlatformRequestInput,
} from "./platform";
export { listMembers, setMemberRole, LastOwnerError } from "./membership";
export type { MemberRow } from "./membership";
