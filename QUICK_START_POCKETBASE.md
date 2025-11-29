# Quick Start Guide - PocketBase Migration

## ✅ Migration Complete!

Your project has been successfully migrated from Supabase to PocketBase. All functionality is preserved with no UI changes.

## 🚀 Getting Started

### Step 1: Install Dependencies

```bash
npm install
```

This will install the PocketBase SDK and remove Supabase dependencies.

### Step 2: Set Up PocketBase Collections

Open your PocketBase admin panel and create the required collections. Follow the detailed guide in `POCKETBASE_SETUP.md`.

**Quick Summary:**
1. Go to `http://your-pocketbase-url/_/`
2. Create 4 collections: `slots`, `registrations`, `users`, `settings`
3. Add fields as specified in the setup guide
4. Enable realtime on all collections
5. Add initial data (slots, super admin user, settings)

### Step 3: Verify Environment Configuration

Check that `.env` file exists with your PocketBase URL:

```env
VITE_POCKETBASE_URL=http://pocketbase-n04swoscgs0c8w0o4cskgk00.109.199.108.64.sslip.io
```

### Step 4: Run the Application

```bash
npm run dev
```

### Step 5: Test Everything

1. **Registration Form** - Visit `http://localhost:5173`
   - Fill out the form
   - Submit a registration
   - Verify it appears in PocketBase admin

2. **Admin Login** - Visit `http://localhost:5173/admin`
   - Login with: `superadmin` / `admin123`
   - Check dashboard loads

3. **Realtime Updates**
   - Open two browser windows
   - Submit a registration in one
   - Watch it appear in the admin dashboard in the other

4. **All Admin Features**
   - User Management - Add/edit/delete slot admins
   - Slot Management - Add/edit/delete slots
   - Settings - Change form title
   - Excel Export - Download registration data

## 📋 What Changed

- **Backend**: Supabase → PocketBase
- **Database**: PostgreSQL → SQLite
- **SDK**: `@supabase/supabase-js` → `pocketbase`
- **Environment**: 2 variables → 1 variable

## 📋 What Stayed the Same

- ✅ All UI and styling
- ✅ All features and functionality
- ✅ Realtime updates
- ✅ Excel export
- ✅ User roles and permissions
- ✅ Form validation
- ✅ Responsive design

## 🔧 Troubleshooting

### App won't start
```bash
# Make sure dependencies are installed
npm install

# Check for errors
npm run dev
```

### Can't connect to PocketBase
- Verify PocketBase is running
- Check `.env` has correct URL
- No trailing slash in URL

### Realtime not working
- Enable realtime on all collections in PocketBase admin
- Check browser console for WebSocket errors

### Login fails
- Verify user exists in PocketBase `users` collection
- Check username and password are correct
- Ensure API rules allow read access

## 📚 Documentation

- **Setup Guide**: `POCKETBASE_SETUP.md` - Detailed collection setup
- **Migration Summary**: `MIGRATION_SUMMARY.md` - Technical changes
- **PocketBase Docs**: https://pocketbase.io/docs/

## 🎉 You're Done!

Your registration app is now running on PocketBase with:
- Self-hosted database on your VPS
- No vendor lock-in
- No usage limits
- Full control over your data
- Same great features as before

Enjoy your PocketBase-powered app! 🚀
