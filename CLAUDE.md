# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Hifz (Quran memorization) class registration and attendance app: a public registration form (`/`) plus an admin dashboard (`/admin`). React 19 + Vite SPA, plain JavaScript (JSX, no TypeScript), backed by a self-hosted **PocketBase** instance.

`README.md` and many root `*.md` files date from an earlier **Supabase** version (SQL tables, RLS, `VITE_SUPABASE_*` env vars). That is no longer accurate — the backend is PocketBase. Treat the root `*.md` files as historical feature notes, not current docs.

## Commands

```bash
npm ci              # install deps (use ci, not install, to avoid rewriting package-lock.json)
npm run dev         # Vite dev server on http://localhost:5173
npm run build       # production build into dist/
npm run lint        # ESLint for the whole repo
npx eslint src/components/Reports2.jsx   # lint a single file
```

There is no test suite. Verify changes by running the app. The repo already has some lint errors (e.g. unused vars), so a non-zero `npm run lint` is not necessarily caused by your change; lint just the files you touched.

## Environment and data — read before running anything

- `.env` (gitignored) sets `VITE_POCKETBASE_URL` plus `POCKETBASE_ADMIN_EMAIL` / `POCKETBASE_ADMIN_PASSWORD`. Only `VITE_*` vars are bundled into the frontend.
- The local `.env` points at the **production** PocketBase (`https://pb.likzet.com`). Running `npm run dev` locally reads and writes **real data**. Read-only actions (viewing, downloading reports) are safe; anything that submits, edits, deletes, or transfers is not.
- The root `*.js` files (`pocketbase-*-setup.js`, `fix-*.js`, `debug-*.js`, `update-*.js`, `test-*.js`) are one-off Node admin scripts that log in as the PocketBase superuser using `.env` and modify collections, rules, or records. With the current `.env` they hit production — do not run them unless explicitly asked.

## Deployment

Production is https://hifz-form.likzet.com, served by **Coolify** on a VPS using the *Static* build pack (nginx) with base directory `/dist`. Coolify does **not** build — it serves the `dist/` folder **committed to git**.

So any frontend change must ship as: edit source → `npm run build` → commit both the source and `dist/` → push `main` → redeploy in Coolify. A source-only push deploys nothing. Before committing `dist/`, make sure no non-`VITE_` values from `.env` ended up in the bundle. (`dist2/` is an old separate build output; `vercel.json` / `public/_redirects` are SPA-rewrite configs from earlier hosting.)

## Architecture

**Backend access.** Everything talks to PocketBase through one shared client, `pb`, exported from `src/lib/supabaseClient.js` (the file name is a leftover from Supabase; it is the PocketBase client). Components call `pb.collection(...)` directly — there is no API or service layer. `pb.autoCancellation(false)` is set globally because many components fire parallel requests.

**Collections** (schema reference: `pb_schema.json`, `pocketbase-collections.json`):
- `slots` — time slots/groups (`display_name`, `slot_order`, per-slot max registrations).
- `registrations` — student sign-ups, each linked to a `slot_id`.
- `users` — admin accounts with `role` of `super_admin` or `slot_admin`; slot admins have `assigned_slot_id`.
- `classes` — Hifz classes (`name`, `description` used as the class summary).
- `attendance` — one record per class × slot × date (`class_id`, `slot_id`, `attendance_date`, `total_students`, `students_absent`). Photo `attachments` are stored **inline as base64 data URIs in a JSON field**, not as PocketBase files, so these records are large.
- `settings` — key/value rows (`form_title`, `supervisor_name`, `report_file_name`, `max_attachment_size_kb`, `max_registrations_per_slot`, ...).

**Auth is custom, not PocketBase auth.** `AdminLogin` queries the `users` collection with a username/password filter (passwords are stored in plain text). The matching record is kept in React state and persisted to `localStorage` (`adminUser`) in `App.jsx`. Requests are not authenticated as that user, so access control lives in the UI plus the collection API rules in PocketBase.

**Role-based dashboard.** `AdminDashboard.jsx` holds the tab state and decides which tabs and components appear by role:
- `slot_admin`: Registrations (filtered to their slot), Attendance entry (`AttendanceTracking`), User Transfer.
- `super_admin`: Registrations (all slots), User Management, Slot Management, Classes, Attendance Analytics, Reports, Reports 2, Settings.

**Realtime.** The dashboard and the `useSlotAvailability` hook (used by the public form to hide full slots) subscribe to PocketBase realtime on `registrations`/`slots` and refetch with debouncing and a short cache.

**Reports vs Reports 2.** `Reports.jsx` and `Reports2.jsx` are near-copies that build per-class reports (supervisor, teacher names derived from slot admins of the slots that entered attendance, class summary, totals, attendance images) with PDF (jsPDF) and Word (docx) export. The main difference: `Reports.jsx` lists only classes that have attendance from every slot, while `Reports2.jsx` lists all classes. Both render the PDF text blocks with `html2canvas` (so Arabic/RTL text displays correctly) and add images through jsPDF.

Both load attendance **without** the `attachments` field, then fetch attachments per record only when generating a file, with limited concurrency (`runWithConcurrency`) to avoid rate limits. A fix to shared report logic usually needs to be applied to both files.
