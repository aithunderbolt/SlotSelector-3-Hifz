/**
 * Debug script to test attendance record creation
 */

import PocketBase from 'pocketbase';
import { config } from 'dotenv';

config();

const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);

async function debugAttendanceCreate() {
  try {
    console.log('🔐 Authenticating as superuser...');
    await pb.collection('_superusers').authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL,
      process.env.POCKETBASE_ADMIN_PASSWORD
    );
    console.log('✅ Authenticated\n');

    // Get collection schema
    console.log('📋 Attendance collection schema:');
    const collection = await pb.collections.getOne('attendance');
    console.log('Fields:', JSON.stringify(collection.fields || collection.schema, null, 2));
    console.log('\n');

    // Get a sample class, slot, and user
    console.log('📦 Fetching sample data...');
    const classes = await pb.collection('classes').getFullList({ $autoCancel: false });
    const slots = await pb.collection('slots').getFullList({ $autoCancel: false });
    const users = await pb.collection('users').getFullList({ $autoCancel: false });

    console.log(`Classes: ${classes.length}`);
    console.log(`Slots: ${slots.length}`);
    console.log(`Users: ${users.length}`);

    if (classes.length === 0 || slots.length === 0 || users.length === 0) {
      console.log('❌ Missing required data');
      return;
    }

    const testClass = classes[0];
    const testSlot = slots[0];
    const testUser = users.find(u => u.role === 'slot_admin') || users[0];

    console.log(`\nUsing:`);
    console.log(`  Class: ${testClass.id} (${testClass.name})`);
    console.log(`  Slot: ${testSlot.id} (${testSlot.display_name})`);
    console.log(`  User: ${testUser.id} (${testUser.username})`);

    // Try to create attendance record
    console.log('\n🧪 Attempting to create attendance record...');
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

    // Clean up
    await pb.collection('attendance').delete(record.id);
    console.log('🧹 Test record deleted');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response, null, 2));
    }
  }
}

debugAttendanceCreate();
