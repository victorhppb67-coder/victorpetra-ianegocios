# Central Leads and Supabase Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the landing-page return link and make diagnostic leads centrally available in an owner-authenticated panel backed by Supabase.

**Architecture:** Keep the site as static HTML. A shared browser client uses the Supabase public anon key with RLS; public visitors may insert leads, while only a manually provisioned admin account may read or manage them. Migrate existing browser-local leads after admin sign-in without discarding data until successful.

**Tech Stack:** Existing HTML/CSS/JavaScript, Supabase Auth, Supabase Postgres with RLS, Supabase JavaScript client v2.

**Spec:** `docs/superpowers/specs/2026-10-16-auth-leads-supabase-design.md`

## Global Constraints

- Never put a Supabase `service_role` key, admin password, or private credential in browser code or Git.
- Use only project URL and public anon key in frontend configuration; require RLS on all lead and admin tables.
- Anonymous clients may insert leads but may not read, update, or delete them.
- Only authenticated users listed in `vp_admins` may read or manage leads; disable public account registration.
- Keep diagnostic scoring, WhatsApp message generation, and existing lead workflow behavior intact.
- Do not claim a lead was recorded when Supabase rejected or failed the insert.
- Preserve local legacy leads until their import is fully successful.
- The Supabase project and Vercel/GitHub deployment integration are owner-configured; do not fabricate credentials or claim deployment success without confirmation.

## Review Focus

- Missing Supabase URL/key: show configuration error; do not silently save as remotely recorded. Manual verification in Tasks 1 and 2.
- Anonymous attempts to read/update/delete leads: RLS denies access. Manual policy verification in Task 1.
- Authenticated non-admin account: RLS denies lead access. Manual policy verification in Tasks 1 and 3.
- Lead submission network failure: result and WhatsApp message remain available, retry is clear, and success is not falsely reported. Manual verification in Task 2.
- Partial legacy import: already imported rows are deduplicated, remaining local rows remain retryable. Manual verification in Task 3.

---

### Task 1: Supabase schema, client, and setup guide

**Files:**
- Create: `supabase/schema.sql`
- Create: `supabase-config.js`
- Create: `supabase-client.js`
- Create: `SUPABASE_SETUP.md`

**Interfaces:**
- `supabase-config.js` exposes `window.VP_SUPABASE_CONFIG = { url, anonKey }`, with empty placeholders and comments.
- `supabase-client.js` exposes `window.VPAuth.signIn(email, password)`, `signOut()`, `getSession()`, `isAdmin()`; `window.VPLeads.create(lead)`, `list()`, `update(id, patch)`, `remove(id)`, and `importLegacy(records)`.
- Lead rows use UUID `id`, nullable unique bigint `legacy_id`, `nome`, `empresa`, `wh`, `seg`, `size`, text arrays `pain` and `info`, `doc`, `dec`, maturity fields, server timestamp, `coluna`, `notas`, and `origem`. Enforce required fields, field length limits, maturity 1–5, and allowed board columns in the database.

- [ ] **Step 1: Define `vp_leads` and `vp_admins` in `supabase/schema.sql`**, enable RLS, and add the anon-insert and admin-only select/update/delete policies. Prevent browser users from modifying admin membership.
- [ ] **Step 2: Add frontend config placeholders** in `supabase-config.js`; add no usable secret or invented project value.
- [ ] **Step 3: Implement the shared v2 client** in `supabase-client.js` with configuration checks and the exact interfaces above. Load the library from the official Supabase JS v2 CDN compatible with the existing no-build static site.
- [ ] **Step 4: Document Supabase setup** in `SUPABASE_SETUP.md`: create project; apply SQL; create owner Auth user with sign-ups disabled; insert that user's UUID into `vp_admins` via the Supabase SQL editor; set the URL and anon key; describe deployment verification and credential boundaries.
- [ ] **Step 5: Manually verify the policies** using anon, authenticated non-admin, and admin sessions. Confirm anon insert is allowed, anon read/manage is denied, non-admin access is denied, and admin read/manage is allowed.

### Task 2: Fix navigation and save diagnostics centrally

**Files:**
- Modify: `pre-diagnostico.html`
- Modify: `index.html` only if the diagnosis link or return behavior needs matching correction.

**Interfaces:**
- Uses `window.VPLeads.create(lead)` from Task 1.
- Existing `calcDiagnostico()` and WhatsApp URL generation stay unchanged.

- [ ] **Step 1: Point the diagnostic logo to `index.html`** and retain all existing links into the diagnostic.
- [ ] **Step 2: Load Supabase configuration/client** from the shared files and replace the current `localStorage vp_leads` save with a central lead insert, passing the current diagnostic fields and computed maturity.
- [ ] **Step 3: Keep results usable on insert failure**; show a clear recording failure state with a retry action, and show recorded status only after the database confirms success.
- [ ] **Step 4: Update the lead-data disclosure** to accurately say the submitted information is stored centrally and used for diagnosis/contact. Do not add retention or legal claims absent from the spec.
- [ ] **Step 5: Manually verify** logo return, successful remote insert, and network/invalid-config failure states; confirm the result and WhatsApp link still work on failure.

### Task 3: Secure panel login, central lead management, and legacy import

**Files:**
- Modify: `painel.html`
- Modify: `SUPABASE_SETUP.md` if setup findings require clarification.

**Interfaces:**
- Uses `window.VPAuth` and `window.VPLeads` from Task 1.
- Existing Kanban rendering, lead-card actions, and CSV export consume the lead fields defined in Task 1.

- [ ] **Step 1: Replace the password-only form** with email/password Supabase Auth sign-in; remove the hard-coded `SENHA` and `sessionStorage vp_auth` check; add sign-out.
- [ ] **Step 2: Gate panel initialization on an authenticated admin session** and load board rows from `VPLeads.list()`; show a distinct unauthorized state for users absent from `vp_admins`.
- [ ] **Step 3: Route lead create/update/delete actions** through the shared client and refresh the board only after successful database operations; surface failures without losing typed edits.
- [ ] **Step 4: Add one-time local `vp_leads` import after admin sign-in**; map legacy numeric IDs to `legacy_id`; deduplicate on that key; remove/mark local records only after all rows have imported successfully; keep partial failures retryable.
- [ ] **Step 5: Manually verify** sign-in, reload/session restoration, sign-out, admin/non-admin access, board CRUD, CSV export, and successful/partial legacy import.

### Task 4: Deployment handoff and final verification

**Files:**
- Modify: `SUPABASE_SETUP.md`

- [ ] **Step 1: Document Vercel configuration** for the root-level static files and the Supabase URL/anon key placeholder; explicitly identify the anon key as public and prohibit `service_role`.
- [ ] **Step 2: Verify GitHub-to-Vercel deployment** only after the owner confirms or connects the Vercel project; verify the homepage URL and `/painel.html` after deploy.
- [ ] **Step 3: Manually verify end-to-end from a separate browser**: submit a diagnostic as a visitor, sign in as owner on another browser/device, and confirm that the lead appears centrally.
- [ ] **Step 4: Check the final branch diff** against the accepted spec and ensure no secrets, hard-coded panel password, or misleading local-only success message remains.

## Delivery Notes

Supabase project URL/anon key and the owner Auth account must be supplied/configured by the repository owner. A PR or branch can be prepared without those values, but the live form and panel cannot connect to Supabase until the project is configured. The existing Vercel homepage in GitHub metadata does not prove the project is connected to GitHub or auto-deploying.
