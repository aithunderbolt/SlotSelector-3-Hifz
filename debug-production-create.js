/**
 * Debug script to test attendance creation on production PocketBase
 */

import PocketBase from 'pocketbase';
import { config } from 'dotenv';

config();

// Use the production URL
const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL;
console.log('PocketBase URL:', POCKETBASE_URL);

const pb = new PocketBase(POCKETBASE_URL);

async function debugProductionCreate() {
  try {
    // Test without auth first (like the browser does)
    console.log('\n🧪 Testing unauthenticated create with exact browser data...');
    
    const attendanceData = {
      class_id: 'aqso3xtc2e09yky',
      slot_id: 'nnyosic7befhmtj',
      admin_user_id: 'a6j6dp36vi71y5l',
      attendance_date: '2025-12-26',
      total_students: 10,
      students_present: 8,
      students_absent: 1,
      students_on_leave: 1,
      notes: 'Test from script'
    };

    console.log('Data:', JSON.stringify(attendanceData, null, 2));

    try {
      const record = await pb.collection('attendance').create(attendanceData);
      console.log('\n✅ Record created successfully!');
      console.log('Record ID:', record.id);

      // Clean up
      await pb.collection('_superusers').authWithPassword(
        process.env.POCKETBASE_ADMIN_EMAIL,
        process.env.POCKETBASE_ADMIN_PASSWORD
      );
      await pb.collection('attendance').delete(record.id);
      console.log('🧹 Test record deleted');
    } catch (err) {
      console.error('\n❌ Create failed:', err.message);
      console.error('Status:', err.status);
      console.error('Data:', JSON.stringify(err.data, null, 2));
      
      // Check if it's a field validation error
      if (err.data?.data) {
        console.error('\nField errors:');
        for (const [field, error] of Object.entries(err.data.data)) {
          console.error(`  ${field}: ${JSON.stringify(error)}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugProductionCreate();
