# Registration Form App - PocketBase Edition

A responsive registration form built with React and Vite, using **PocketBase** as the self-hosted backend.

## 🎉 What's New

This version uses **PocketBase** instead of Supabase:
- ✅ Self-hosted on your VPS
- ✅ SQLite database (single file)
- ✅ No vendor lock-in
- ✅ No usage limits
- ✅ Built-in admin UI
- ✅ Realtime subscriptions included
- ✅ Same features as Supabase version

## Features

- Registration form with Name, Email, WhatsApp Mobile, and Time Slot selection
- Configurable time slots with individual maximum registrations per slot
- Real-time slot availability updates
- Fully responsive design
- Slots automatically hidden when full
- Admin dashboard with role-based access control
- User management for slot admins
- Slot management with editable names and capacities
- Settings management for form customization
- Excel export functionality

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up PocketBase

Follow the detailed guide in `POCKETBASE_SETUP.md` to:
- Create collections (slots, registrations, users, settings)
- Add initial data
- Configure API rules
- Enable realtime

### 3. Configure Environment

Create a `.env` file (or use the existing one):

```env
VITE_POCKETBASE_URL=http://your-pocketbase-url
```

### 4. Run the App

```bash
npm run dev
```

## PocketBase Collections

### slots
- `display_name` (text, required, unique)
- `slot_order` (number, required, unique)
- `max_registrations` (number, default: 15)

### registrations
- `name` (text, required)
- `email` (email, required)
- `whatsapp_mobile` (text, required, unique)
- `slot_id` (relation to slots, required)
- `fathers_name` (text, optional)
- `date_of_birth` (text, optional)
- `tajweed_level` (text, optional)
- `education` (text, optional)
- `profession` (text, optional)
- `previous_hifz` (text, optional)

### users
- `name` (text, optional)
- `username` (text, required, unique)
- `password` (text, required)
- `role` (select: super_admin, slot_admin)
- `assigned_slot_id` (relation to slots, optional)

### settings
- `key` (text, required, unique)
- `value` (text, required)

## Admin Access

### Super Admin
- **Username**: `superadmin`
- **Password**: `admin123`
- **Permissions**: Full access to all features

### Slot Admins
- Create via User Management tab
- Can only view their assigned slot
- Can download their slot data

## Admin Features

### Super Admin Dashboard
- View all registrations across all slots
- Filter by slot
- Download Excel reports
- Real-time updates
- Statistics for all slots

### User Management
- Add/edit/delete slot admin users
- Assign admins to specific slots
- Change usernames and passwords

### Slot Management
- Add/edit/delete time slots
- Change slot display names
- Set individual max registrations per slot
- Real-time updates across the app

### Settings
- Customize registration form title
- Set default max registrations
- Changes apply immediately

## Development

```bash
npm run dev
```

## Production Build

```bash
npm run build
```

Deploy the `dist` folder to your hosting service.

## Environment Variables

- `VITE_POCKETBASE_URL` - Your PocketBase server URL

## PocketBase Management

### Access Admin UI
```
http://your-pocketbase-url/_/
```

### Backup Database
PocketBase stores everything in `pb_data/data.db`. To backup:
1. Stop PocketBase
2. Copy the `pb_data` folder
3. Restart PocketBase

### View Logs
Check Coolify logs or PocketBase console output for debugging.

## Documentation

- **Setup Guide**: `POCKETBASE_SETUP.md` - Complete setup instructions
- **Migration Summary**: `MIGRATION_SUMMARY.md` - Technical details
- **Quick Start**: `QUICK_START_POCKETBASE.md` - Fast setup guide
- **Checklist**: `POCKETBASE_MIGRATION_CHECKLIST.md` - Verification steps

## Troubleshooting

### Connection Issues
- Verify PocketBase is running
- Check `.env` has correct URL
- Ensure no trailing slash in URL

### Realtime Not Working
- Enable realtime on all collections
- Check WebSocket connection in browser DevTools

### Authentication Fails
- Verify user exists in PocketBase
- Check credentials are correct
- Review API rules

## Tech Stack

- **Frontend**: React 19, Vite
- **Backend**: PocketBase
- **Database**: SQLite (via PocketBase)
- **Styling**: CSS
- **Routing**: React Router
- **Excel Export**: XLSX

## Benefits Over Supabase

✅ **Self-hosted** - Full control on your VPS
✅ **No costs** - No usage limits or pricing tiers
✅ **Simpler** - Single executable, no complex setup
✅ **Portable** - SQLite file is easy to backup/move
✅ **Privacy** - Your data stays on your server
✅ **Fast** - No external API calls, lower latency

## License

MIT

## Support

For PocketBase documentation: https://pocketbase.io/docs/

For issues with this app, check the documentation files in this repository.
