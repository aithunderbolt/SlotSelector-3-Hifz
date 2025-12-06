# User Transfer Feature

## Overview
The User Transfer feature allows slot admins to view all registered users in the system and transfer them to their assigned slot with a single click.

## Features

### For Slot Admins
- **New "User Transfer" Tab**: Accessible from the admin dashboard
- **View All Users**: See all registered users across all slots
- **Search Functionality**: Search by name, father's name, email, mobile, tajweed level, or slot
- **Sort Functionality**: Sort by any column (name, email, slot, registration date, etc.)
- **Transfer Users**: Click "Take" button to move a user to your slot
- **Confirmation Dialog**: Confirms the transfer before executing
- **Visual Indicators**: Users already in your slot are highlighted in green

### User Interface
1. **Search Bar**: Filter users by any field
2. **Results Counter**: Shows filtered vs total users
3. **Sortable Columns**: Click column headers to sort
4. **Action Buttons**: 
   - "Take" button for users in other slots
   - "Already in your slot" message for users in your slot

### Transfer Process
1. Slot admin clicks "Take" button next to a user
2. Confirmation modal appears showing:
   - User's name
   - Current slot (From)
   - Destination slot (To)
   - Warning message
3. Admin confirms or cancels
4. User is transferred to the admin's slot
5. Table refreshes automatically

## Technical Details

### Components
- **UserTransfer.jsx**: Main component for the transfer functionality
- **UserTransfer.css**: Styling for the transfer interface
- **AdminDashboard.jsx**: Updated to include the new tab

### Database Operations
- Reads all registrations from PocketBase
- Updates the `slot_id` field when transferring
- Real-time updates via PocketBase subscriptions

### Permissions
- Only slot admins can access this feature
- Super admins do not see this tab (they have full access via other tabs)
- Slot admins can only transfer users TO their assigned slot

## Usage

### As a Slot Admin:
1. Log in to the admin dashboard
2. Click on the "User Transfer" tab
3. Browse or search for users
4. Click "Take" next to any user you want to transfer
5. Confirm the transfer in the modal
6. The user is now in your slot

### Search Examples:
- Search by name: "Ahmed"
- Search by email: "user@example.com"
- Search by slot: "Morning"
- Search by tajweed level: "Intermediate"

### Sorting:
- Click any column header to sort
- Click again to reverse sort direction
- Sort indicators: ↕ (unsorted), ↑ (ascending), ↓ (descending)

## Security Considerations
- **Application-Level Security**:
  - Slot admins can only transfer users TO their slot (not from)
  - Confirmation required before any transfer
  - Access control enforced by AdminDashboard component
  - Only logged-in slot admins can access the User Transfer tab
- **Database-Level**:
  - PocketBase allows all updates to registrations (updateRule is empty)
  - This is necessary because the app uses custom authentication
  - Delete operations still require superuser access
- Real-time updates ensure data consistency

## Setup Requirements

### Database Permissions
The `registrations` collection must have an empty update rule to allow frontend updates:
```
Update Rule: ""  (empty string)
```

This has been configured by running the `fix-authentication.js` script:
```bash
node fix-authentication.js
```

To verify permissions, run:
```bash
node verify-permissions.js
```

Expected output:
```
📁 REGISTRATIONS
Update Rule: (empty - anyone can update)
```

## Future Enhancements
- Transfer history/audit log
- Bulk transfer functionality
- Transfer restrictions based on slot capacity
- Email notifications to users when transferred
