/**
 * Debug script to test attendance record creation WITHOUT authentication
 * This simulates what the frontend does
 */

import PocketBase from 'pocketbase';
import { config } from 'dotenv';

config();

const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);

async function debugUnauthenticatedCreate() {
  try {
    // First, get the data we need (as superuser)
    console.log('🔐 Getting test data as superuser...');
    await pb.collection('_superusers').authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL,
      process.env.POCKETBASE_ADMIN_PASSWORD
    );

    const classes = await pb.collection('classes').getFullList();
    const slots = await pb.collection('slots').getFullList();
    const users = await pb.collection('users').getFullList({ filter: 'role = "slot_admin"' });

    const testClass = classes[0];
    const testUser = users[0];
    const testSlot = await pb.collection('slots').getOne(testUser.assigned_slot_id);

    console.log(`Class: ${testClass.id} (${testClass.name})`);
    console.log(`Slot: ${testSlot.id} (${testSlot.display_name.substring(0, 30)}...)`);
    console.log(`User: ${testUser.id} (${testUser.username})`);

    // Clear auth to simulate unauthenticated request
    console.log('\n🔓 Clearing authentication...');
    pb.authStore.clear();
    console.log(`Auth valid: ${pb.authStore.isValid}`);

    // Try to create attendance record without auth
    console.log('\n🧪 Attempting to create attendance record (unauthenticated)...');
    const attendanceData = {
      class_id: testClass.id,
      slot_id: testSlot.id,
      admin_user_id: testUser.id,
      attendance_date: '2025-12-26',
      total_students: 10,
      students_present: 8,
      students_absent: 1,
      students_on_leave: 1,
      notes: 'Test record'
    };

    console.log('Data:', JSON.stringify(attendanceData, null, 2));

    const record = await pb.collection('attendance').create(attendanceData);
    console.log('\n✅ Record created successfully!');
    console.log('Record ID:', record.id);

    // Clean up (need to re-auth)
    await pb.collection('_superusers').authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL,
      process.env.POCKETBASE_ADMIN_PASSWORD
    );
    await pb.collection('attendance').delete(record.id);
    console.log('🧹 Test record deleted');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
    if (error.originalError) {
      console.error('Original:', error.originalError);
    }
  }
}

debugUnauthenticatedCreate();
