# Automated PocketBase Setup Guide

This guide shows you how to set up PocketBase collections automatically using scripts instead of manual UI configuration.

## 📋 Four Methods Available

### Method 1: Shell Scripts (Easiest) 🚀
One command to set up everything

### Method 2: Node.js Scripts (Recommended) ⭐
Fully automated setup using JavaScript

### Method 3: JSON Import
Import collection definitions via PocketBase admin UI

### Method 4: Manual Setup
Follow the original `POCKETBASE_SETUP.md` guide

---

## Method 1: Shell Scripts (One Command) 🚀

### For Linux/Mac

```bash
# Make script executable
chmod +x setup-pocketbase.sh

# Edit the scripts first to add your credentials
# Then run:
./setup-pocketbase.sh
```

### For Windows

```cmd
setup-pocketbase.bat
```

**What it does:**
1. Checks Node.js and npm are installed
2. Installs PocketBase SDK
3. Runs collection setup script
4. Runs data seeding script
5. Reminds you to enable realtime

**Before running:**
- Edit `pocketbase-setup.js` and `pocketbase-seed.js`
- Update POCKETBASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD

---

## Method 2: Node.js Scripts (Manual Steps) ⭐

### Prerequisites

- Node.js installed
- PocketBase running and accessible
- PocketBase admin account created

### Step 1: Install PocketBase SDK

```bash
npm install pocketbase
```

### Step 2: Configure Scripts

Edit both `pocketbase-setup.js` and `pocketbase-seed.js`:

```javascript
const POCKETBASE_URL = 'http://your-pocketbase-url';
const ADMIN_EMAIL = 'your-admin-email';
const ADMIN_PASSWORD = 'your-admin-password';
```

**Important**: Use your PocketBase **admin** credentials (the ones you use to login to `/_/`), not app user credentials.

### Step 3: Create Collections

```bash
node pocketbase-setup.js
```

This will create:
- ✅ `slots` collection
- ✅ `registrations` collection
- ✅ `users` collection
- ✅ `settings` collection

**Output:**
```
🔐 Authenticating as admin...
✅ Authenticated successfully

📦 Creating "slots" collection...
✅ "slots" collection created

📦 Creating "registrations" collection...
✅ "registrations" collection created

📦 Creating "users" collection...
✅ "users" collection created

📦 Creating "settings" collection...
✅ "settings" collection created

🎉 All collections created successfully!
```

### Step 4: Seed Initial Data

```bash
node pocketbase-seed.js
```

This will add:
- ✅ 10 time slots (Slot 1 - Slot 10)
- ✅ Super admin user (superadmin/admin123)
- ✅ 3 slot admin users (slot1admin, slot2admin, slot3admin)
- ✅ Default settings (form title, max registrations)

**Output:**
```
🔐 Authenticating as admin...
✅ Authenticated successfully

📦 Adding slots...
   ✅ Created: Slot 1
   ✅ Created: Slot 2
   ...
✅ Slots added

📦 Adding super admin user...
   ✅ Created: superadmin (password: admin123)
✅ Super admin user added

📦 Adding slot admin users...
   ✅ Created: slot1admin (password: slot1pass)
   ✅ Created: slot2admin (password: slot2pass)
   ✅ Created: slot3admin (password: slot3pass)
✅ Slot admin users added

📦 Adding settings...
   ✅ Created: form_title
   ✅ Created: max_registrations_per_slot
✅ Settings added

🎉 All data seeded successfully!
```

### Step 5: Verify Setup

1. Open PocketBase admin: `http://your-pocketbase-url/_/`
2. Check that all 4 collections exist
3. Verify data is present in each collection
4. Enable realtime on all collections (see below)

### Step 6: Enable Realtime

**Important**: The scripts create collections but don't enable realtime. You need to do this manually:

1. Go to PocketBase admin UI
2. For each collection (slots, registrations, users, settings):
   - Click on the collection
   - Go to "Options" tab
   - Check "Enable realtime"
   - Click "Save"

### Step 7: Test Your App

```bash
npm run dev
```

Visit `http://localhost:5173` and test the registration form!

---

## Method 3: JSON Import

### Step 1: Get Collection Definitions

The file `pocketbase-collections.json` contains all collection schemas.

### Step 2: Import via Admin UI

1. Open PocketBase admin: `http://your-pocketbase-url/_/`
2. Go to "Settings" → "Import collections"
3. Upload `pocketbase-collections.json`
4. Click "Import"

**Note**: This method creates collections but not the initial data. You'll need to:
- Manually add slots, users, and settings via the admin UI
- Or run `pocketbase-seed.js` after import

### Step 3: Enable Realtime

Same as Method 1, Step 6.

---

## Method 4: Manual Setup

Follow the original guide: `POCKETBASE_SETUP.md`

This method gives you full control but takes longer (15-20 minutes).

---

## Troubleshooting

### Error: "Failed to authenticate"

**Problem**: Wrong admin credentials

**Solution**: 
1. Go to `http://your-pocketbase-url/_/`
2. Login with your admin account
3. Use those same credentials in the scripts

### Error: "Collection already exists"

**Problem**: Collections were already created

**Solution**: 
- Skip `pocketbase-setup.js`
- Run only `pocketbase-seed.js` to add data
- Or delete collections in admin UI and run setup again

### Error: "Cannot find module 'pocketbase'"

**Problem**: PocketBase SDK not installed

**Solution**:
```bash
npm install pocketbase
```

### Error: "Failed to fetch"

**Problem**: PocketBase URL is wrong or PocketBase is not running

**Solution**:
1. Check PocketBase is running in Coolify
2. Verify URL in scripts matches your PocketBase URL
3. Try accessing `http://your-url/_/` in browser

### Realtime not working

**Problem**: Realtime not enabled on collections

**Solution**: Manually enable realtime on all collections (see Step 6 above)

---

## Comparison of Methods

| Feature | Method 1 (Shell) | Method 2 (Node) | Method 3 (JSON) | Method 4 (Manual) |
|---------|-----------------|-----------------|-----------------|-------------------|
| Speed | 🚀 Fastest (1 min) | ⚡ Fast (2 min) | ⚡ Fast (5 min) | 🐌 Slow (15-20 min) |
| Automation | ✅ Full | ✅ Full | ⚠️ Partial | ❌ None |
| Initial Data | ✅ Included | ✅ Included | ❌ Manual | ❌ Manual |
| Realtime Setup | ⚠️ Manual | ⚠️ Manual | ⚠️ Manual | ⚠️ Manual |
| Flexibility | ⚠️ Limited | ⚠️ Limited | ⚠️ Limited | ✅ Full |
| Recommended | 🚀🚀🚀 | ⭐⭐⭐ | ⭐⭐ | ⭐ |

---

## What Gets Created

### Collections (4)

1. **slots**
   - Fields: display_name, slot_order, max_registrations
   - Indexes: Unique on display_name and slot_order

2. **registrations**
   - Fields: name, email, whatsapp_mobile, slot_id, fathers_name, date_of_birth, tajweed_level, education, profession, previous_hifz
   - Indexes: Unique on whatsapp_mobile
   - Relations: slot_id → slots

3. **users**
   - Fields: name, username, password, role, assigned_slot_id
   - Indexes: Unique on username
   - Relations: assigned_slot_id → slots

4. **settings**
   - Fields: key, value
   - Indexes: Unique on key

### Initial Data (via seed script)

- **10 slots**: Slot 1 through Slot 10 (max 15 registrations each)
- **1 super admin**: superadmin / admin123
- **3 slot admins**: slot1admin, slot2admin, slot3admin (passwords: slot1pass, etc.)
- **2 settings**: form_title, max_registrations_per_slot

---

## Security Notes

### Change Default Passwords

After setup, change these default passwords:

1. Login as superadmin
2. Go to User Management
3. Edit each user and set new passwords

### API Rules

The scripts set permissive API rules for development:
- `listRule: ""` - Anyone can list
- `viewRule: ""` - Anyone can view
- `createRule: ""` - Anyone can create

**For production**, consider restricting these rules.

### Admin Credentials

Never commit your admin credentials to git. The scripts are configured with placeholders - update them locally only.

---

## Next Steps

After running the scripts:

1. ✅ Collections created
2. ✅ Initial data added
3. ⚠️ Enable realtime (manual step)
4. ✅ Run your React app: `npm run dev`
5. ✅ Test everything using `POCKETBASE_MIGRATION_CHECKLIST.md`

---

## Quick Command Reference

```bash
# Install dependencies
npm install pocketbase

# Create collections
node pocketbase-setup.js

# Add initial data
node pocketbase-seed.js

# Run your app
npm run dev
```

---

## Support

- **PocketBase API Docs**: https://pocketbase.io/docs/api-collections/
- **PocketBase JS SDK**: https://github.com/pocketbase/js-sdk
- **Script Issues**: Check the troubleshooting section above

---

## Summary

✅ **Fastest method**: Run both scripts (2 minutes total)
✅ **Most automated**: Creates everything except realtime toggle
✅ **Repeatable**: Can run multiple times safely
✅ **Customizable**: Edit scripts to change default data

Enjoy your automated PocketBase setup! 🚀
