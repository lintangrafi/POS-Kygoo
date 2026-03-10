---
name: pos-guide-coauthor
description: 'Co-author and maintain COMPLETE_APPLICATION_GUIDE style docs for POS Kygo. Use when creating full product documentation, syncing docs with code/schema/API, generating module workflows, and running documentation quality checks.'
argument-hint: 'What doc outcome do you want (new guide, section update, or consistency audit)?'
user-invocable: true
---

# POS Guide Co-Author

## What This Skill Produces
- A complete or partial application guide aligned with the current codebase.
- Section updates that stay consistent with database schema, actions, pages, and API routes.
- A documentation consistency audit report with fixes.

## When to Use
- You need to create a comprehensive app guide for this POS project.
- You changed features (POS, inventory, reports, shifts, invoices, users) and docs are stale.
- You want a repeatable checklist to keep docs accurate before release.

## Inputs
- Target file path. Example: `COMPLETE_APPLICATION_GUIDE.md`.
- Requested mode: `new-guide`, `section-update`, or `consistency-audit`.
- Optional audience and language preference.

## Workflow
1. Confirm scope and output.
2. Collect source of truth from code and data model.
3. Build or update sections in a stable order.
4. Run consistency checks.
5. Apply edits and produce a concise change summary.

## Detailed Procedure

### 1. Confirm Scope and Output
- Ask for mode:
  - `new-guide`: create full guide structure from scratch.
  - `section-update`: modify only named sections.
  - `consistency-audit`: verify claims and fix mismatches.
- Confirm target file and preferred language/tone.
- Confirm whether examples should include concrete commands and default credentials.

### 2. Collect Source of Truth
- Read:
  - `src/db/schema.ts`
  - `src/actions/*.ts`
  - `src/app/(dashboard)/**/page.tsx`
  - `src/app/api/**`
  - `README.md`
  - migration files in `migrations/`
- Extract facts only from code or explicit docs, and mark uncertain claims as assumptions.

### 3. Compose or Update Documentation
- Recommended section order:
  1. Overview and feature map
  2. Installation and environment setup
  3. Database entities and relationships
  4. Role/permission matrix
  5. Module workflows (POS, inventory, reports, expenses, income, shifts, invoices)
  6. API endpoints summary
  7. Development and testing guide
  8. Troubleshooting and deployment
- For each section:
  - Prefer precise statements over generic wording.
  - Include formulas where business logic exists (profit, cashflow, reconciliation).
  - Keep command examples executable as written.

### 4. Decision Points
- If code and docs conflict:
  - Prioritize code as source of truth.
  - Add a short note only if behavior is ambiguous.
- If feature exists in docs but not in code:
  - Move it to planned/roadmap wording, or remove it.
- If endpoint naming is inconsistent:
  - Keep actual route path from code and flag legacy names.
- If data types differ between prose and schema:
  - Use schema values and update prose.

### 5. Quality Checks (Completion Criteria)
- Coverage:
  - Every major module has purpose, workflow, and common actions.
- Accuracy:
  - Roles, enums, statuses, and formulas match code/schema.
- Operability:
  - Setup steps include required env vars and runnable commands.
- Navigability:
  - Table of contents and headings are aligned.
- Safety:
  - Default credentials and secrets are labeled as non-production.

### 6. Output Contract
- Save edits to the target markdown file.
- Return:
  - what changed,
  - unresolved assumptions/questions,
  - next review actions.

## Quick Prompt Examples
- `/pos-guide-coauthor new-guide for this repo in Bahasa Indonesia, include full module walkthroughs.`
- `/pos-guide-coauthor section-update: refresh API Endpoints and Role Matrix based on current code.`
- `/pos-guide-coauthor consistency-audit COMPLETE_APPLICATION_GUIDE.md and patch only mismatched claims.`

## Guardrails
- Do not invent endpoints, fields, or permissions.
- Do not expose real production credentials.
- Keep examples aligned with project scripts and folder structure.
