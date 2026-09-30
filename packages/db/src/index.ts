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
  ApprovalBindingError,
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
export {
  saveDrawing,
  listDrawings,
  getDrawing,
  setDrawingStatus,
  getBomRun,
  latestRevisionId,
  revisionIdForSlots,
  DRAWING_STATUSES,
  DRAWING_STATUS_LABEL,
  isDrawingStatus,
  DRAWING_PURPOSES,
  DRAWING_PURPOSE_LABEL,
  isDrawingPurpose,
  setDrawingPurpose,
  DrawingLockedError,
  DrawingStatusBackwardsError,
} from "./drawing";
export type { DrawingStatus, DrawingPurpose, SaveDrawingInput } from "./drawing";
export {
  saveDocument,
  listDocuments,
  getDocument,
  setDocumentStatus,
  DOCUMENT_TYPES,
  DOCUMENT_STATUSES,
  isDocumentType,
  isDocumentStatus,
  DocumentLockedError,
  DocumentStatusBackwardsError,
} from "./document";
export type { DocumentType, DocumentStatus, SaveDocumentInput } from "./document";
export {
  createPurchaseRequest,
  listPurchaseRequests,
  getPurchaseRequest,
  setPurchaseRequestStatus,
  PR_STATUSES,
  PR_STATUS_LABEL,
  isPrStatus,
  PrLockedError,
  PrBackwardsError,
  PrDuplicateError,
  PrEmptyError,
} from "./purchase";
export type { PrStatus, PrLineInput, CreatePrInput } from "./purchase";
export { isRunApproved, assertRunApproved, BomNotApprovedError } from "./approval-gate";
export { traceRun } from "./trace";
export type { RunTrace } from "./trace";

export {
  PRINT_DOC_TYPES, PAPERS, FONTS, DEFAULT_PRINT, isPrintDocType, parsePrintSettings, getPrintSetup, savePrintSetup,
  type PrintDocType, type PrintSettings,
} from "./print";

export { hashPassword, verifyPassword, burnVerify } from "./password";
export {
  platformListSources, platformInsertSource, platformSourceContents, platformSetSourceMonitor,
  platformCreateJob, platformSetJobState, platformStepStart, platformStepFinish, platformGetJob, platformListJobs,
  platformInsertFeatures, platformDeleteFeatures, platformListFeatures,
  platformInsertFormula, platformListFormulas, platformDecideFormula, platformProjectFormula, platformListProjections,
  listSuggestions, setSuggestionState,
  type LearningSourceRow, type LearningJobRow, type LearningStepRow, type FeatureInsert, type FeatureRow, type FormulaInsert, type FormulaRow,
  type ProjectionRow, type SuggestionRow,
} from "./learning";
export {
  platformListPrograms, platformGrantSpecial, platformGrantsWithBilling,
  listSpecialGrants, fanCandidates, tenantFanCurves, insertSpecialRun, listSpecialRuns, specialRunsForBomRun, platformUpdateFanPoint,
  type SpecialProgramRow, type GrantBillingRow, type SpecialGrantRow, type FanSegmentRow, type SpecialRunInsert, type SpecialRunRow,
} from "./special";

// 0038 · 0039 · ccmd L · LA-2 · LA-3 — 생산 · 창고 · 품질 · 공지 · QR
export * from "./mes";
