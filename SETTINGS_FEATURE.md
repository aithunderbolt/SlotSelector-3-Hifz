# Settings Management Feature

## Overview
Added a new Settings management feature that allows super admins to customize the registration form title and maximum registrations per slot from the admin dashboard.

## What's New

### 1. Database Setup
- **File:** `create-settings-table.sql`
- Creates a new `settings` table to store application configuration
- Includes RLS policies for secure access
- Pre-populates with default form title: "Hifz Registration Form"

### 2. Settings Component
- **Files:** `src/components/Settings.jsx` and `src/components/Settings.css`
- New admin interface for managing application settings
- Supports editing the registration form title
- Supports configuring maximum registrations per slot (1-100)
- Real-time validation and feedback

### 3. Admin Dashboard Integration
- **File:** `src/components/AdminDashboard.jsx`
- Added new "Settings" tab (super admin only)
- Seamlessly integrated with existing tabs

### 4. Dynamic Form Title
- **File:** `src/components/RegistrationForm.jsx`
- Registration form now fetches title from database
- Real-time updates when title changes
- Falls back to default if settings not found

### 5. Dynamic Maximum Registrations
- **Files:** `src/hooks/useSlotAvailability.js` and `src/components/AdminDashboard.jsx`
- System now fetches max registrations per slot from database
- Real-time updates when max registrations changes
- Affects slot availability across the entire system
- Falls back to default (15) if setting not found

## Installation Steps

1. **Run the SQL migration:**
   ```bash
   # Open Supabase SQL Editor and run:
   create-settings-table.sql
   
   # If you already have the settings table, run this to add the new setting:
   add-max-registrations-setting.sql
   ```

2. **The feature is ready to use!**
   - No additional npm packages required
   - All dependencies already included

## How to Use

1. Login as super admin at `/admin`
2. Click on the "Settings" tab
3. Update the "Registration Form Title" field (optional)
4. Update the "Maximum Registrations Per Slot" field (1-100)
5. Click "Save Settings"
6. Changes take effect immediately across the entire system:
   - Registration form shows/hides slots based on new limit
   - Admin dashboard displays updated slot capacity
   - Slot availability updates in real-time

## Features

- ✅ Real-time updates across all users
- ✅ Input validation (non-empty title, valid max registrations)
- ✅ Success/error feedback messages
- ✅ Clean, intuitive interface
- ✅ Responsive design
- ✅ Super admin only access
- ✅ Dynamic slot capacity management
- ✅ System-wide effect on slot availability
- ✅ Configurable limits (1-100 registrations per slot)

## Technical Details

- Uses Supabase realtime subscriptions for instant updates
- Implements proper error handling
- Follows existing code patterns and styling
- No breaking changes to existing functionality
- Max registrations setting affects:
  - `useSlotAvailability` hook - filters available slots
  - `AdminDashboard` - displays slot capacity
  - `RegistrationForm` - shows only available slots
- Falls back to default value (15) if setting not found
- Validates max registrations (1-100 range)

## Database Constraints

The system uses application-level validation rather than database constraints for maximum registrations. This approach provides:
- **Flexibility**: Easy to change the limit without database migrations
- **Real-time updates**: Changes take effect immediately
- **No data migration**: Existing registrations remain valid even if limit is reduced
- **Graceful handling**: System continues to work if setting is missing

If you need to enforce hard database constraints, you can add a check constraint or trigger in Supabase, but this is not required for the feature to work correctly.
