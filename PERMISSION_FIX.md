# Permission Fix for User Transfer Feature

## Problem
When slot admins tried to transfer users, they received the error:
```
Failed to transfer user: The requested resource wasn't found. (404)
```

## Root Cause
The application uses a custom `users` table for authentication instead of PocketBase's built-in auth system. This means:
1. The `registrations` collection had `updateRule: null` (only superusers could update)
2. When we changed it to `@request.auth.id != ""`, it still failed because there's no PocketBase auth session
3. The app manages authentication at the application level, not at the PocketBase level

## Solution
Updated the `registrations` collection's update rule to allow all updates:

```javascript
updateRule: ''  // Empty string = allow all updates
```

This works because:
- The app has its own authentication layer via the custom `users` table
- Access control is enforced at the component level (AdminDashboard, UserTransfer)
- Only logged-in slot admins can access the User Transfer feature
- PocketBase acts as a database, not an auth provider

## Implementation
1. Created `fix-authentication.js` script
2. Script authenticates as superuser
3. Updates the registrations collection's updateRule to empty string
4. Slot admins can now transfer users (frontend enforces access control)

## Verification
Run `verify-permissions.js` to check all collection permissions:

```bash
node verify-permissions.js
```

Expected output for registrations:
```
📁 REGISTRATIONS
Update Rule: (empty - anyone can update)
```

## Files Created/Modified
- `fix-authentication.js` - Script to fix permissions (run this)
- `update-registration-permissions.js` - Initial attempt (superseded by fix-authentication.js)
- `verify-permissions.js` - Script to verify permissions
- `USER_TRANSFER_FEATURE.md` - Updated documentation
- `PERMISSION_FIX.md` - This document

## Testing
1. Log in as a slot admin
2. Navigate to "User Transfer" tab
3. Click "Take" button on any user
4. Confirm the transfer
5. User should be successfully transferred to your slot

## Security Notes
- **Database Level**: PocketBase allows all updates to registrations (updateRule is empty)
- **Application Level**: Access control is enforced by the frontend
  - Users must log in via AdminLogin component
  - Only slot admins see the User Transfer tab
  - AdminDashboard checks user role before rendering features
- **Trade-off**: This approach prioritizes functionality over database-level security
- **Recommendation**: For production, consider migrating to PocketBase's auth collection
- Delete operations still require superuser access (deleteRule is null)
