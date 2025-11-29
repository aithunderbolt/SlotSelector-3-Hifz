# PocketBase Setup Guide

This guide will help you set up PocketBase collections for the Registration Form App.

## Step 1: Access PocketBase Admin

1. Go to your PocketBase URL: `http://your-pocketbase-url/_/`
2. Login with your admin credentials

## Step 2: Create Collections

### Collection 1: slots

1. Click "New collection" → "Base collection"
2. Name: `slots`
3. Add the following fields:

| Field Name | Type | Options |
|------------|------|---------|
| `display_name` | Text | Required, Unique |
| `slot_order` | Number | Required, Unique, Min: 1 |
| `max_registrations` | Number | Min: 1, Max: 100, Default: 15 |

4. **API Rules** (click on "API Rules" tab):
   - List/Search: Allow anyone
   - View: Allow anyone
   - Create: Admins only
   - Update: Allow anyone (or Admins only for more security)
   - Delete: Admins only

5. Click "Create"

### Collection 2: registrations

1. Click "New collection" → "Base collection"
2. Name: `registrations`
3. Add the following fields:

| Field Name | Type | Options |
|------------|------|---------|
| `name` | Text | Required |
| `email` | Email | Required |
| `whatsapp_mobile` | Text | Required, Unique |
| `slot_id` | Relation | Required, Collection: slots, Single |
| `fathers_name` | Text | Optional |
| `date_of_birth` | Text | Optional (stores YYYY-MM-DD format) |
| `tajweed_level` | Text | Optional |
| `education` | Text | Optional |
| `profession` | Text | Optional |
| `previous_hifz` | Text | Optional |

4. **API Rules**:
   - List/Search: Allow anyone
   - View: Allow anyone
   - Create: Allow anyone
   - Update: Admins only
   - Delete: Admins only

5. Click "Create"

### Collection 3: users

1. Click "New collection" → "Base collection"
2. Name: `users`
3. Add the following fields:

| Field Name | Type | Options |
|------------|------|---------|
| `name` | Text | Optional |
| `username` | Text | Required, Unique |
| `password` | Text | Required |
| `role` | Select | Required, Options: `super_admin`, `slot_admin` |
| `assigned_slot_id` | Relation | Optional, Collection: slots, Single |

4. **API Rules**:
   - List/Search: Allow anyone
   - View: Allow anyone
   - Create: Allow anyone (or Admins only)
   - Update: Allow anyone (or Admins only)
   - Delete: Allow anyone (or Admins only)

5. Click "Create"

### Collection 4: settings

1. Click "New collection" → "Base collection"
2. Name: `settings`
3. Add the following fields:

| Field Name | Type | Options |
|------------|------|---------|
| `key` | Text | Required, Unique |
| `value` | Text | Required |

4. **API Rules**:
   - List/Search: Allow anyone
   - View: Allow anyone
   - Create: Allow anyone (or Admins only)
   - Update: Allow anyone (or Admins only)
   - Delete: Admins only

5. Click "Create"

## Step 3: Add Initial Data

### Add Slots

Go to the `slots` collection and add records:

```
Display Name: "Slot 1", Slot Order: 1, Max Registrations: 15
Display Name: "Slot 2", Slot Order: 2, Max Registrations: 15
Display Name: "Slot 3", Slot Order: 3, Max Registrations: 15
... (add as many as you need)
```

### Add Super Admin User

Go to the `users` collection and add a record:

```
Name: "Super Admin"
Username: "superadmin"
Password: "admin123"
Role: "super_admin"
Assigned Slot: (leave empty)
```

### Add Settings

Go to the `settings` collection and add records:

```
Key: "form_title", Value: "Hifz Registration Form"
Key: "max_registrations_per_slot", Value: "15"
```

## Step 4: Enable Realtime

For each collection:
1. Click on the collection
2. Go to "Options" tab
3. Enable "Realtime" checkbox
4. Save

## Step 5: Configure Your React App

Create a `.env` file in your project root:

```env
VITE_POCKETBASE_URL=http://your-pocketbase-url
```

Replace `http://your-pocketbase-url` with your actual PocketBase URL.

## Step 6: Install Dependencies and Run

```bash
npm install
npm run dev
```

## Important Notes

### API Rules Security

The current setup allows "anyone" to access most endpoints for simplicity. For production:

1. Consider restricting Create/Update/Delete operations to authenticated users only
2. Use PocketBase's rule system to implement proper authorization
3. Example rule: `@request.auth.id != ""`

### Realtime Subscriptions

Make sure realtime is enabled on all collections for live updates to work properly.

### Backup

PocketBase stores everything in a single SQLite file (`pb_data/data.db`). To backup:
- Stop PocketBase
- Copy the entire `pb_data` folder
- Restart PocketBase

### CORS

If you encounter CORS issues, PocketBase automatically handles CORS for you. Make sure your React app is making requests to the correct PocketBase URL.

## Troubleshooting

### "Failed to fetch" errors
- Check if PocketBase is running
- Verify the VITE_POCKETBASE_URL in your .env file
- Check browser console for CORS errors

### Realtime not working
- Ensure realtime is enabled on all collections
- Check if WebSocket connection is established in browser DevTools → Network → WS

### Authentication issues
- Verify user credentials in PocketBase admin
- Check API rules allow the operations you're trying to perform

## Migration from Supabase

If you're migrating from Supabase:

1. Export your Supabase data (CSV or JSON)
2. Import into PocketBase collections using the admin UI
3. Update the `.env` file with PocketBase URL
4. The code has been updated to use PocketBase SDK

All functionality remains the same - no UI changes!
