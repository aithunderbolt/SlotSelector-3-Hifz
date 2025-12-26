/**
 * Fix Attendance Collection Permissions
 * 
 * This script updates the attendance collection to allow create/update/delete
 * operations since the app uses a custom users table for authentication.
 * 
 * Run: node fix-attendance-permissions.js
 */

import PocketBase from 'pocketbase';
import { config } from 'dotenv';

config();

const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);

async function fixAttendancePermissions() {
  try {
    console.log('🔐 Authenticating as superuser...');
    await pb.collection('_superusers').authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL,
      process.env.POCKETBASE_ADMIN_PASSWORD
    );
    console.log('✅ Authenticated successfully\n');

    // Get the attendance collection
    console.log('📦 Fetching attendance collection...');
    const attendanceCollection = await pb.collections.getOne('attendance');
    console.log('Current rules:');
    console.log(`   listRule: ${attendanceCollection.listRule === '' ? '(empty - anyone)' : attendanceCollection.listRule || '(null - superuser only)'}`);
    console.log(`   viewRule: ${attendanceCollection.viewRule === '' ? '(empty - anyone)' : attendanceCollection.viewRule || '(null - superuser only)'}`);
    console.log(`   createRule: ${attendanceCollection.createRule === '' ? '(empty - anyone)' : attendanceCollection.createRule || '(null - superuser only)'}`);
    console.log(`   updateRule: ${attendanceCollection.updateRule === '' ? '(empty - anyone)' : attendanceCollection.updateRule || '(null - superuser only)'}`);
    console.log(`   deleteRule: ${attendanceCollection.deleteRule === '' ? '(empty - anyone)' : attendanceCollection.deleteRule || '(null - superuser only)'}`);

    // Update permissions to allow all operations (frontend handles access control)
    console.log('\n🔧 Updating attendance collection permissions...');
    await pb.collections.update(attendanceCollection.id, {
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
    });

    console.log('✅ Attendance collection permissions updated!\n');
    console.log('New rules:');
    console.log('   listRule: (empty - anyone)');
    console.log('   viewRule: (empty - anyone)');
    console.log('   createRule: (empty - anyone)');
    console.log('   updateRule: (empty - anyone)');
    console.log('   deleteRule: (empty - anyone)');
    console.log('\n🎉 Done! Slot admins can now create attendance records.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

fixAttendancePermissions();
