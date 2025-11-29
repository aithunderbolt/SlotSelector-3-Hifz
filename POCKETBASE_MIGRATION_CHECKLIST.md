# PocketBase Migration Checklist

Use this checklist to ensure your migration is complete and working properly.

## ✅ Pre-Migration (Completed)

- [x] Code updated to use PocketBase SDK
- [x] All components migrated
- [x] Realtime subscriptions converted
- [x] Environment variables updated
- [x] Documentation created

## 📦 Installation Steps

- [ ] Run `npm install` to install PocketBase SDK
- [ ] Verify `.env` file exists with correct PocketBase URL
- [ ] Check no errors in terminal after install

## 🗄️ PocketBase Setup

### Collections Created

- [ ] **slots** collection
  - [ ] Fields: display_name, slot_order, max_registrations
  - [ ] API rules configured
  - [ ] Realtime enabled
  - [ ] Initial data added (10 slots)

- [ ] **registrations** collection
  - [ ] Fields: name, email, whatsapp_mobile, slot_id, fathers_name, date_of_birth, tajweed_level, education, profession, previous_hifz
  - [ ] API rules configured
  - [ ] Realtime enabled

- [ ] **users** collection
  - [ ] Fields: name, username, password, role, assigned_slot_id
  - [ ] API rules configured
  - [ ] Super admin user created (superadmin/admin123)
  - [ ] Test slot admin users created (optional)

- [ ] **settings** collection
  - [ ] Fields: key, value
  - [ ] API rules configured
  - [ ] Realtime enabled
  - [ ] Initial settings added (form_title, max_registrations_per_slot)

## 🧪 Testing

### Registration Form

- [ ] Form loads without errors
- [ ] All fields display correctly
- [ ] Available slots show up
- [ ] Form validation works
- [ ] Can submit a registration
- [ ] Success message appears
- [ ] Registration appears in PocketBase admin
- [ ] WhatsApp number uniqueness enforced

### Admin Login

- [ ] Login page loads
- [ ] Can login with superadmin credentials
- [ ] Invalid credentials show error
- [ ] Redirects to dashboard after login

### Admin Dashboard

- [ ] Dashboard loads with user info
- [ ] Total registrations count correct
- [ ] Slot counts display correctly
- [ ] Registration table shows data
- [ ] Can filter by slot (super admin)
- [ ] Excel export works
- [ ] Logout button works

### Realtime Updates

- [ ] Open registration form in one window
- [ ] Open admin dashboard in another
- [ ] Submit registration
- [ ] Dashboard updates automatically (no refresh needed)
- [ ] Slot counts update in real-time
- [ ] Available slots update when full

### User Management (Super Admin)

- [ ] User Management tab loads
- [ ] Can see list of slot admins
- [ ] Can add new slot admin
- [ ] Can edit existing slot admin
- [ ] Can delete slot admin
- [ ] Changes reflect immediately

### Slot Management (Super Admin)

- [ ] Slot Management tab loads
- [ ] Can see all slots
- [ ] Can edit slot name
- [ ] Can edit max registrations
- [ ] Can add new slot
- [ ] Can delete empty slot
- [ ] Cannot delete slot with registrations
- [ ] Changes reflect immediately

### Settings (Super Admin)

- [ ] Settings tab loads
- [ ] Can see current form title
- [ ] Can change form title
- [ ] Form title updates on registration page (realtime)
- [ ] Can change max registrations per slot
- [ ] Settings save successfully

### Slot Admin Access

- [ ] Create a slot admin user in PocketBase
- [ ] Login as slot admin
- [ ] Can only see assigned slot data
- [ ] Cannot access other tabs
- [ ] Can download their slot data
- [ ] Realtime updates work

## 🔍 Error Checking

- [ ] No console errors in browser
- [ ] No network errors in DevTools
- [ ] WebSocket connection established (check Network → WS tab)
- [ ] All API calls return 200 status
- [ ] No CORS errors

## 📊 Data Verification

- [ ] All registrations from Supabase migrated (if applicable)
- [ ] All slots configured correctly
- [ ] All users created
- [ ] Settings configured
- [ ] Data integrity maintained

## 🚀 Production Readiness

- [ ] PocketBase running on VPS
- [ ] PocketBase accessible via public URL
- [ ] Backup strategy in place
- [ ] SSL/HTTPS configured (recommended)
- [ ] API rules reviewed for security
- [ ] Environment variables set correctly
- [ ] Build process tested (`npm run build`)

## 📝 Documentation Review

- [ ] Read `POCKETBASE_SETUP.md`
- [ ] Read `MIGRATION_SUMMARY.md`
- [ ] Read `QUICK_START_POCKETBASE.md`
- [ ] Understand backup process
- [ ] Know how to add new collections/fields

## 🎯 Final Verification

- [ ] All features from Supabase version working
- [ ] No UI changes or regressions
- [ ] Performance is acceptable
- [ ] Realtime updates working smoothly
- [ ] Mobile responsive (test on phone)
- [ ] Multiple users can use simultaneously

## ✨ Optional Enhancements

- [ ] Set up automated backups for PocketBase
- [ ] Configure SSL certificate for HTTPS
- [ ] Set up monitoring/logging
- [ ] Implement rate limiting (if needed)
- [ ] Add custom validation rules in PocketBase
- [ ] Configure email notifications (PocketBase supports this)

## 🆘 If Something Doesn't Work

1. Check browser console for errors
2. Check PocketBase logs in Coolify
3. Verify collection API rules
4. Ensure realtime is enabled
5. Check `.env` file URL is correct
6. Restart PocketBase service
7. Clear browser cache
8. Review `MIGRATION_SUMMARY.md` for common issues

## 📞 Support Resources

- PocketBase Documentation: https://pocketbase.io/docs/
- PocketBase GitHub: https://github.com/pocketbase/pocketbase
- PocketBase Discord: https://discord.gg/pocketbase

---

## ✅ Migration Complete!

Once all items are checked, your migration is complete and your app is running on PocketBase!

**Date Completed**: _______________

**Tested By**: _______________

**Notes**: _______________
