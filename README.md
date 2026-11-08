# Hifz Registration & Attendance App

A React + Vite web app for Hifz (Quran memorization) classes, backed by a self-hosted [PocketBase](https://pocketbase.io/) server. It has two parts:

- **Registration form** (`/`): students register and pick a time slot. Full slots are hidden automatically, with live updates.
- **Admin dashboard** (`/admin`): slot admins and a super admin manage registrations, attendance, classes and reports.

## Features

**Slot admins** (each assigned to one slot):
- View and export (Excel) registrations for their slot
- Enter class attendance: total students, students absent, and up to 3 photo attachments
- Transfer students to other slots

**Super admin:**
- View and export registrations across all slots
- Manage slot admin users
- Manage slots (display names, order, per-slot maximum registrations)
- Manage Hifz classes and their class summaries
- Attendance analytics
- **Reports**: per-class reports for classes that have attendance from every slot
- **Reports 2**: per-class reports for all classes, with selectable classes
- Both report tabs download as PDF or Word, with font-size options and attendance photos
- Settings: form title, default maximum registrations per slot, attachment size limit, supervisor name, report file name

## Tech Stack

- React 19, React Router 7, Vite 7 (plain JavaScript/JSX)
- PocketBase JS SDK (data, realtime subscriptions)
- jsPDF + html2canvas (PDF reports), docx + file-saver (Word reports), xlsx (Excel export)

## Setup

1. **Install dependencies**
   ```bash
   npm ci
   ```

2. **Configure environment**: copy `.env.example` to `.env` and fill in:

   | Variable | Used by | Purpose |
   |---|---|---|
   | `VITE_POCKETBASE_URL` | app + scripts | PocketBase server URL (no trailing slash) |
   | `POCKETBASE_ADMIN_EMAIL` | Node scripts only | PocketBase superuser email |
   | `POCKETBASE_ADMIN_PASSWORD` | Node scripts only | PocketBase superuser password |

   Only `VITE_*` variables are bundled into the frontend.

3. **PocketBase collections**: the app uses `slots`, `registrations`, `users`, `settings`, `classes` and `attendance`. The schema is in `pb_schema.json` / `pocketbase-collections.json`. The setup scripts in the repo root (`pocketbase-setup-v2.js`, `pocketbase-classes-attendance-setup.js`, `pocketbase-seed.js`) create collections and seed data, using the server and superuser from `.env`.

   > **Warning:** these scripts, and the other `fix-*.js` / `debug-*.js` / `update-*.js` scripts in the root, change whichever PocketBase server `VITE_POCKETBASE_URL` points to. Make sure that is not production before running them.

## Development

```bash
npm run dev      # dev server at http://localhost:5173
npm run lint     # ESLint
```

If `.env` points at the production PocketBase, the local app reads and writes real data.

## Deployment

Production runs on a VPS with **Coolify**, using the *Static* build pack (nginx) with base directory `/dist`. Coolify serves the **`dist/` folder committed to git**; it does not build the app.

To deploy a change:

1. `npm run build`
2. Commit the source changes **and** the updated `dist/` folder
3. Push to `main`
4. Redeploy the app in Coolify (if it doesn't auto-deploy), then hard-refresh the site (Ctrl+F5)

## Admin Access

Admin accounts are records in the PocketBase `users` collection, with `role` set to `super_admin` or `slot_admin`; slot admins also have an `assigned_slot_id`. Super admins can add and edit slot admins from the **User Management** tab.

## Older docs

The other `*.md` files in the repo root are notes written while individual features were built, plus the Supabase → PocketBase migration. Some of them describe the earlier Supabase version and may be out of date.
