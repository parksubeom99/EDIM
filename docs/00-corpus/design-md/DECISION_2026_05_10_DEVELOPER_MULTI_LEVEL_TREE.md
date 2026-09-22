# Decision: EDIM Developer Uses Multi-Level Configuration Tree

Date: 2026-05-10

## Decision

EDIM Developer left panel must not stop at one child level.
It uses a directory-style multi-level tree:

1. major group
2. work area
3. detailed setting item
4. additional child levels as needed

## Reason

EDIM Developer controls system-wide settings such as Head, Template, Permission, Engine, Adapter, SaaS operations, Release, and Audit.
One child level is too shallow and makes unrelated settings appear at the same level.

## Current Prototype Structure

Examples:

- Platform Structure
  - Core Engine Registry
    - BOM Engine
    - Rule Engine
    - Macro Engine
    - Drawing Engine
    - Approval Engine
  - Global System Settings
    - Tenant Boundary
    - Code Governance
    - Engine Run Policy
    - AI / Macro Guardrail
    - CAD Adapter Policy
  - Module / Head Registry
    - Head Registry
    - Head Panel Binding
    - Head Lifecycle

- Permission / Template
  - Permission Point Catalog
    - User Role
    - Department Scope
    - Object Scope
    - Approval Authority
  - Template Schema Manager
    - Left Panel Schema
    - Main Panel Schema
    - Right Accordion Schema
    - Approval Template Schema
    - Mobile Template Schema
  - Panel Template Builder
    - Panel Component DB
    - Template Composer
    - Binding Preview
    - Panel Permission Guardrail
  - Main Shell Template Rules
    - Tenant Branding Rule
    - Hierarchy Operation Rule
    - Main Panel Call Rule
    - Right Accordion Rule
    - Permission / Approval / History Rule

## Rules

- The tree is a classification and management address.
- Actual cross-links are handled by Reference, Binding, Related Setting, and Audit tables.
- Moving a tree node must not break stable keys.
- A selected tree item calls its own center template and virtual data set.
- Users can keep adding child items under the selected item.

