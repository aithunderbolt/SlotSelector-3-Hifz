# Classes and Attendance Feature Setup

This document explains how to set up the Classes and Attendance tracking feature in PocketBase.

## Overview

This feature adds:
1. **Classes Management** (Super Admin) - Create, edit, delete classes with name, description, and duration
2. **Attendance Tracking** (Slot Admin) - Record attendance for each class session
3. **Attendance Analytics** (Super Admin) - View attendance statistics and identify missing entries

## PocketBase Collections Setup

### Option 1: Run the Setup Script

```bash
node pocketbase-classes-attendance-setup.js
```

Make sure your `.env` file has these variables:
```
VITE_POCKETBASE_URL=http://127.0.0.1:8090
POCKETBASE_ADMIN_EMAIL=your-admin@email.com
POCKETBASE_ADMIN_PASSWORD=your-admin-password
```

### Option 2: Manual Setup via PocketBase Admin UI

#### Step 1: Create the `classes` Collection

1. Go to PocketBase Admin UI (http://127.0.0.1:8090/_/)
2. Click "New collection"
3. Set collection name: `classes`
4. Add the following fields:

| Field Name | Type | Required | Options |
|------------|------|----------|---------|
| name | Text | Yes | Min: 1, Max: 255 |
| description | Text | No | Max: 2000 |
| duration | Number | Yes | Min: 1 |

5. Set API Rules (leave all empty for full access):
   - List/Search rule: (empty)
   - View rule: (empty)
   - Create rule: (empty)
   - Update rule: (empty)
   - Delete rule: (empty)

6. Click "Create"

#### Step 2: Create the `attendance` Collection

1. Click "New collection"
2. Set collection name: `attendance`
3. Add the following fields:

| Field Name | Type | Required | Options |
|------------|------|----------|---------|
| class_id | Relation | Yes | Collection: classes, Max select: 1, Cascade delete: Yes |
| slot_id | Relation | Yes | Collection: slots, Max select: 1, Cascade delete: Yes |
| admin_user_id | Relation | Yes | Collection: users, Max select: 1, Cascade delete: Yes |
| attendance_date | Date | Yes | - |
| total_students | Number | Yes | Min: 0 |
| students_present | Number | Yes | Min: 0 |
| students_absent | Number | Yes | Min: 0 |
| students_on_leave | Number | Yes | Min: 0 |
| notes | Text | No | Max: 2000 |

4. Set API Rules (leave all empty for full access):
   - List/Search rule: (empty)
   - View rule: (empty)
   - Create rule: (empty)
   - Update rule: (empty)
   - Delete rule: (empty)

5. Click "Create"

## New Features in Admin Dashboard

### For Super Admin:

1. **Classes Tab** - Manage class definitions
   - Add new classes with name, description, and duration
   - Edit existing classes
   - Delete classes (will also delete associated attendance records)

2. **Attendance Analytics Tab** - View attendance statistics
   - Total attendance by class (all time)
   - Attendance rate calculations
   - List of slot admins who haven't entered attendance for specific classes
   - Detailed view of all attendance records

### For Slot Admin:

1. **Attendance Tab** - Track attendance for your slot
   - Select a class from the dropdown
   - Enter date, total students, present, absent, and on leave counts
   - Add optional notes
   - Edit or delete your attendance records
   - Validation ensures Present + Absent + On Leave = Total Students

## Data Model

### Classes Collection
```
{
  id: string (auto-generated),
  name: string,
  description: string (optional),
  duration: number (in minutes),
  created: datetime,
  updated: datetime
}
```

### Attendance Collection
```
{
  id: string (auto-generated),
  class_id: relation -> classes,
  slot_id: relation -> slots,
  admin_user_id: relation -> users,
  attendance_date: date,
  total_students: number,
  students_present: number,
  students_absent: number,
  students_on_leave: number,
  notes: string (optional),
  created: datetime,
  updated: datetime
}
```

## Validation Rules

- **Total Students Validation**: When entering attendance, the sum of students_present + students_absent + students_on_leave must equal total_students
- **Slot Admin Restriction**: Slot admins can only view and manage attendance records for their assigned slot
- **Class Deletion**: Deleting a class will cascade delete all associated attendance records
