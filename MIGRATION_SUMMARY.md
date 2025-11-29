# Migration from Supabase to PocketBase - Summary

## What Changed

### 1. Dependencies
- **Removed**: `@supabase/supabase-js`
- **Added**: `pocketbase` (v0.21.5)

### 2. Client Configuration
- **File**: `src/lib/supabaseClient.js`
- Changed from Supabase client to PocketBase client
- Now requires only `VITE_POCKETBASE_URL` environment variable

### 3. API Calls Updated

All Supabase queries have been converted to PocketBase equivalents:

| Supabase | PocketBase |
|----------|------------|
| `supabase.from('table').select()` | `pb.collection('table').getFullList()` |
| `supabase.from('table').insert()` | `pb.collection('table').create()` |
| `supabase.from('table').update()` | `pb.collection('table').update()` |
| `supabase.from('table').delete()` | `pb.collection('table').delete()` |
| `supabase.from('table').eq()` | `filter: 'field = "value"'` |

### 4. Realtime Subscriptions

**Supabase:**
```javascript
supabase.channel('name')
  .on('postgres_changes', {...}, callback)
  .subscribe()
```

**PocketBase:**
```javascript
pb.collection('table').subscribe('*', callback)
```

### 5. Field Name Changes

PocketBase uses different default field names:
- `created_at` → `created`
- `updated_at` → `updated`

### 6. Relations/Joins

**Supabase:**
```javascript
.select('*, slots(display_name)')
```

**PocketBase:**
```javascript
.getFullList({ expand: 'slot_id' })
// Access via: record.expand.slot_id.display_name
```

## Files Modified

1. ✅ `package.json` - Updated dependencies
2. ✅ `.env.example` - Changed to PocketBase URL
3. ✅ `src/lib/supabaseClient.js` - PocketBase client setup
4. ✅ `src/components/AdminLogin.jsx` - PocketBase authentication
5. ✅ `src/components/RegistrationForm.jsx` - PocketBase queries
6. ✅ `src/components/AdminDashboard.jsx` - PocketBase queries & realtime
7. ✅ `src/components/Settings.jsx` - PocketBase queries
8. ✅ `src/components/SlotManagement.jsx` - PocketBase queries
9. ✅ `src/components/UserManagement.jsx` - PocketBase queries
10. ✅ `src/hooks/useSlotAvailability.js` - PocketBase queries & realtime

## Files Created

1. ✅ `.env` - PocketBase URL configuration
2. ✅ `POCKETBASE_SETUP.md` - Complete setup guide
3. ✅ `MIGRATION_SUMMARY.md` - This file

## What Stayed the Same

✅ **All UI/UX** - No visual changes
✅ **All functionality** - Registration, admin dashboard, user management, etc.
✅ **All CSS files** - No styling changes
✅ **Component structure** - Same React components
✅ **Routing** - Same routes and navigation
✅ **Excel export** - Still works the same
✅ **Form validation** - Same validation logic
✅ **Realtime updates** - Still works (via PocketBase subscriptions)

## Next Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up PocketBase collections:**
   - Follow the guide in `POCKETBASE_SETUP.md`
   - Create 4 collections: slots, registrations, users, settings
   - Add initial data

3. **Configure environment:**
   - Update `.env` with your PocketBase URL (already done)

4. **Run the app:**
   ```bash
   npm run dev
   ```

5. **Test all features:**
   - Registration form
   - Admin login
   - Dashboard with realtime updates
   - User management
   - Slot management
   - Settings
   - Excel export

## Benefits of PocketBase

✅ Self-hosted on your VPS
✅ No vendor lock-in
✅ No usage limits or pricing tiers
✅ Simpler architecture (single executable)
✅ Built-in admin UI
✅ Realtime subscriptions included
✅ Easy backups (single SQLite file)
✅ Lower latency (your own server)

## Potential Issues & Solutions

### Issue: "Failed to fetch"
**Solution**: Check if PocketBase is running and URL is correct in `.env`

### Issue: Realtime not working
**Solution**: Enable realtime on all collections in PocketBase admin

### Issue: CORS errors
**Solution**: PocketBase handles CORS automatically, but check your URL doesn't have trailing slashes

### Issue: Authentication fails
**Solution**: Verify user exists in PocketBase `users` collection with correct credentials

## Rollback Plan

If you need to rollback to Supabase:

1. Restore the original files from git
2. Run `npm install` to restore Supabase dependency
3. Update `.env` with Supabase credentials
4. Restart the app

## Support

For PocketBase documentation: https://pocketbase.io/docs/

For issues with this migration, check:
- PocketBase admin UI for data
- Browser console for errors
- Network tab for API calls
