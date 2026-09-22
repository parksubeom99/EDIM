# EDIM Developer Template Test Data

Date: 2026-05-10

## Purpose

EDIM Developer의 좌측 Panel은 개발자가 관리할 업무 Tree이다.
좌측 업무 항목을 선택하면 중앙 Panel에는 해당 업무의 Template과 가상 Data가 나타나야 한다.

## Prototype Rule

Selection flow:

1. User selects `EDIM Developer`.
2. User selects a work item from the left Developer Work / Template Tree.
3. Center panel resolves the selected work item.
4. Center panel displays:
   - Developer Work title
   - Center Template name
   - Virtual DB name
   - Permission point
   - sample records
   - operation checks

## Virtual Data Examples

| Left Work Item | Center Template | Virtual DB |
| --- | --- | --- |
| Platform Structure | Platform Structure Overview Template | `edim_developer_directory` |
| Core Engine Registry | Core Engine Registry Template | `engine_registry` |
| Permission Point Catalog | Permission Point Catalog Template | `permission_point_catalog` |
| Template Schema Manager | Template Schema Manager Template | `template_schema_registry` |
| CAD / Drawing Adapter | CAD / Drawing Adapter Template | `cad_adapter_registry` |
| SaaS Tenant Operations | SaaS Tenant Operations Template | `tenant_operation_registry` |
| Release / Audit Control | Release / Audit Control Template | `release_audit_log` |

## Notes

- The current prototype uses in-browser virtual data.
- Later backend implementation should move this data into real registry tables.
- The important confirmed rule is: left Developer Tree item selects the center Template.

## Multi-Level Tree Update

The Developer Tree now uses at least three levels:

1. Major group: Platform Structure, Permission / Template, Engine / Adapter, Operations / Release
2. Work area: Core Engine Registry, Template Schema Manager, CAD / Drawing Adapter, Release / Audit Control
3. Detailed setting: BOM Engine, Main Panel Schema, SolidWorks API, Rollback

Additional child levels can be added below any selected item.
