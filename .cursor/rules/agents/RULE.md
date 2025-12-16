1. GLOBAL DEVELOPMENT RULES

You are developing a government-grade enterprise system for the Department of Education (DepEd) that must comply with COA, DBM, GAA, Civil Service, and RA 9184 standards.

Non-Negotiable Principles

Audit-first design

Approval-driven workflows

Role-Based Access Control (RBAC)

Non-destructive data handling

Consistency across all modules

❌ Never bypass workflows
❌ Never hard-delete records
❌ Never skip approval levels
❌ Never introduce UI inconsistency across CRUD pages

2. UI / DESIGN SYSTEM RULES (MANDATORY)
   Design Baseline

The /staff page is the canonical UI reference

ALL CRUD pages must:

Follow the same layout

Follow the same spacing, typography, and structure

Follow the same action placement (Add, Edit, View, Archive)

If a new CRUD page is created:
➡️ Clone the /staff page layout and adapt fields only
➡️ Do NOT redesign from scratch

UI Stack (STRICT)

shadcn/ui (mandatory)

Tailwind CSS

Lucide Icons

No custom UI libraries

No inline styles

Use only:

Card, Table, Dialog, Drawer, Button

Form, Input, Textarea, Select

Badge, Tooltip, DropdownMenu

AlertDialog for destructive actions

CRUD Page Structure (STANDARD)

Every CRUD page MUST follow this order:
Use /staff for reference.

Page Header

Title

Short description

Primary action button (Add New)

Filter & Search Bar

Search input (left)

Filters (right)

Status dropdowns if applicable

Table

Paginated

Row actions via dropdown menu

Dialogs / Drawers

Create

Edit

View (read-only)

Archive (soft delete)

Footer Notes

Compliance notes if required

Status legends

3. CRUD BEHAVIOR RULES
   Data Handling

Soft delete only on important data

Use is_active, archived_at, archived_by

Preserve history

No overwriting critical fields without logging

Forms

Use react-hook-form + zod

Required fields must be validated

Approval-triggering fields must show warnings

Status Fields

All records must have:

status

created_by

created_at

updated_at

updated_by

4. AUDIT TRAIL & LOGGING RULES

Every mutation MUST:

Create an audit log record

Store:

User ID

Action type

Entity name

Record ID

Old value

New value

Timestamp

No exceptions.

5. ROLE-BASED ACCESS CONTROL (RBAC)
   UI Enforcement

Buttons must be hidden if user lacks permission

Fields must be read-only if role cannot modify

Approval buttons shown only to approvers

Backend Enforcement

RBAC checks must exist on API level

UI checks are NOT sufficient

6. APPROVAL WORKFLOW RULES

All approval flows are state machines

States are immutable once completed

Rejections require remarks

Returned items go back to previous stage

No skipping.
No auto-approval.

7. NOTIFICATION RULES

Trigger notifications on:

Submission

Approval

Rejection

Return for revision

Delivery & inspection milestones

Notifications must:

Be role-aware

Be non-dismissable until read

8. DOCUMENT & FORM GENERATION

Generated documents must:

Follow government form structure

Be linked to the source record

Be immutable once approved

Have version tracking

9. FILE & FOLDER CONVENTIONS (NEXT.JS)
   /app
   /staff ← UI BASELINE
   /procurement
   /assets
   /reports
   /components
   /ui ← shadcn components
   /layout
   /tables
   /forms
   /lib
   /rbac
   /audit
   /workflow
   /store
   /auth
   /user
   /permissions

10. CODING RULES

TypeScript only

No any

Use enums for statuses

Use constants for roles

Avoid duplicated logic

Extract reusable CRUD logic

11. WHAT TO DO WHEN UNCERTAIN

If a feature is unclear:

Follow COA compliance

Follow approval hierarchy

Follow /staff UI pattern

Ask before inventing behavior

12. FINAL RULE

Consistency > Creativity

This is a government system, not a startup MVP.
