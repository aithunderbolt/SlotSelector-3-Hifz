/**
 * Debug script to check existing attendance records
 */

import PocketBase from 'pocketbase';
import { config } from 'dotenv';

config();

const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);

async function debugExistingRecords() {
  try {
    console.log('🔐 Authenticating...');
    await pb.collection('_superusers').authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL,
      process.env.POCKETBASE_ADMIN_PASSWORD
    );

    // Get attendance collection indexes
    const collection = await pb.collections.getOne('attendance');
    console.log('\n📋 Attendance collection indexes:');
    console.log(JSON.stringify(collection.indexes, null, 2));

    // Get all attendance records
    console.log('\n📦 Existing attendance records:');
    const records = await pb.collection('attendance').getFullList({
      expand: 'class_id,slot_id,admin_user_id'
    });

    if (records.length === 0) {
      console.log('No attendance records found.');
    } else {
      for (const record of records) {
        console.log(`\nRecord ${record.id}:`);
        console.log(`  Date: ${record.attendance_date}`);
        console.log(`  Class: ${record.expand?.class_id?.name || record.class_id}`);
        console.log(`  Slot: ${record.expand?.slot_id?.display_name?.substring(0, 30) || record.slot_id}...`);
        console.log(`  Admin: ${record.expand?.admin_user_id?.username || record.admin_user_id}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
  }
}

debugExistingRecords();
