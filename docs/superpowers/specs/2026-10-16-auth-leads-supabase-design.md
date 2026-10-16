# Supabase Authentication and Central Lead Storage Design

Date: 2026-10-16
Repository: `victorhppb67-coder/victorpetra-ianegocios`
Status: Draft for user review

## Problem

The site is a static HTML app with three root pages. The diagnostic page saves records to browser-local `localStorage`, so each visitor's data stays in their own browser. The leads panel reads the same local storage and uses a password embedded in `painel.html`. The diagnostic logo links to `victor-petra-landing.html`, but the public landing page in the repository is `index.html`.

The repository has no backend, database configuration, Supabase files, or GitHub Actions workflows. Its GitHub repository metadata lists `https://victorpetra-ianegocios.vercel.app` as its homepage; Vercel deployment linkage and automatic deploy behavior still need confirmation.

## Goals

- Fix the diagnostic logo so it returns to the real landing page.
- Store new diagnostic leads centrally so the owner can see them from the panel on any device.
- Replace the hard-coded panel password and client-set auth flag with Supabase Auth.
- Keep public visitors able to submit leads, while restricting lead reads and management to the configured panel administrator.
- Preserve leads stored locally in the owner's current browser by offering a one-time authenticated import without importing duplicates.
- Keep the site as static HTML; do not introduce a server-side service-role key into browser code.

## Recommended architecture

Use the existing static pages with the Supabase JavaScript client. A public `anon` key may be used in the browser only with Row Level Security (RLS) enabled. Never place the Supabase `service_role` key or an admin password in repository code.

Create:
- `supabase/schema.sql`: `vp_leads` table, `vp_admins` table, indexes/constraints, RLS enablement, and policies.
- `supabase-config.js`: a clearly documented placeholder for the project URL and public anon key, with no secret values.
- `supabase-client.js`: shared client initialization and small lead/auth operations.

The project owner creates the Supabase project, creates the single admin account through Supabase Auth, and registers that account's UUID in `vp_admins`. Public sign-up stays disabled. The RLS policy allows anonymous and authenticated clients to insert a lead, but only an authenticated user listed in `vp_admins` can select, update, or delete leads. Server-side database constraints validate required fields and reasonable lengths. No policy allows public reads.

## Request and data flow

1. A visitor opens `index.html`, follows the existing diagnostic link, and completes the questionnaire.
2. The browser computes the diagnostic and builds the WhatsApp message as it does today.
3. On completion, the browser submits the lead to `vp_leads` using the public anon key. Database RLS permits insertion only; it does not grant access to read stored leads.
4. The page shows the result and WhatsApp link whether or not lead submission succeeds. On submission failure, it displays a clear message that the lead was not recorded and provides a retry action; it must not claim successful recording.
5. The owner opens `painel.html` and signs in with the Supabase Auth account created for the owner.
6. The panel verifies the authenticated session and retrieves leads. RLS rejects reads and edits from users absent from `vp_admins`.
7. Existing local `vp_leads` data in the owner's browser is offered for one-time import after admin login. Import uses each local lead's existing id as a stable deduplication key. Local records are retained until every insert succeeds; failed items remain available for retry. This cannot recover records stored in other visitors' browsers.

## Credential and token handling

- Delete the literal `SENHA` and the `sessionStorage vp_auth` bypass from `painel.html`.
- Use Supabase Auth sign-in/sign-out and session restoration through the official client.
- Use only the project URL and public anon key in frontend configuration.
- Never store credentials in Git, HTML, browser local storage, or build output. Never expose `service_role`.
- Keep RLS enabled and test policies against both anonymous and non-admin authenticated access.
- Do not enable public registration. The owner account is provisioned in the Supabase dashboard.

## User interface and error handling

- Change the diagnostic logo target to `index.html`.
- Add an explicit loading state to panel sign-in and lead loading; show useful errors for invalid credentials, missing Supabase configuration, network failure, and denied access.
- Add a sign-out action.
- Make lead submission failure visible and retryable; the local diagnostic result remains available.
- Escape/untrusted data before rendering lead fields as HTML.
- Keep WhatsApp message generation and diagnostic scoring behavior unchanged.

## Privacy and abuse notes

Lead records include names, company names, phone numbers, and business questionnaire answers. The public diagnostic copy must accurately disclose that the data is stored in the configured Supabase project and used for the stated diagnostic/contact purposes before central storage is enabled. Do not add unsupported retention promises.

RLS prevents public reads but does not prevent automated spam submissions. Add basic field constraints; consider a CAPTCHA/rate-limited Edge Function if spam becomes material. An anon key is designed to be public and is not a substitute for RLS.

## Deployment and setup

The repository is a root-level static site and names Vercel as its homepage, but the repo does not establish whether Vercel is connected to GitHub or whether pushes to `main` deploy automatically. Keep the implementation deployable as static files. Include a setup guide covering Supabase project creation, applying `schema.sql`, setting URL/anon key, creating/registering the admin UUID, and Vercel deployment verification. No external project secrets can be supplied by code; the owner must configure the project and credentials.

## Acceptance criteria

- Diagnostic logo returns to the repository's landing page.
- A diagnostic submission appears in the central table and can be seen in the panel from a separate browser/device after owner sign-in.
- Anonymous clients cannot query, update, or delete leads.
- Only the configured admin can read and manage leads; invalid sign-in fails; sign-out clears the session.
- No hard-coded password or service-role key remains in frontend files.
- Local test leads can be imported without duplicate records and are not deleted if import partially fails.
- Errors do not silently imply a lead was saved when it was not.
- The Vercel/static setup is documented, and deployment is confirmed only after the actual Vercel project integration and Supabase configuration are provided.

## Verification plan

- Review RLS policies using anonymous, non-admin, and admin sessions.
- Exercise the diagnostic submission flow with configured Supabase credentials and confirm persistence from a separate browser session.
- Exercise sign-in, sign-out, reload/session restoration, and denied-access states.
- Verify the logo target and all page links.
- Inspect generated HTML/JavaScript for hard-coded secrets and unsafe rendering of lead values.
- Confirm the Vercel deployment after the owner connects or confirms the project and supplies the public Supabase configuration.
