/**
 * Debug script to test different date formats
 */

import PocketBase from 'pocketbase';
import { config } from 'dotenv';

config();

const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);

async function debugDateFormat() {
  try {
    console.log('🔐 Getting test data...');
    await pb.collection('_superusers').authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL,
      process.env.POCKETBASE_ADMIN_PASSWORD
    );

    const classes = await pb.collection('classes').getFullList();
    const users = await pb.collection('users').getFullList({ filter: 'role = "slot_admin"' });
    const testClass = classes[0];
    const testUser = users[0];

    pb.authStore.clear();

    const dateFormats = [
      '2025-12-26',
      '2025-12-26T00:00:00.000Z',
      '2025-12-26 00:00:00',
      new Date('2025-12-26').toISOString(),
    ];

    for (const dateFormat of dateFormats) {
      console.log(`\n🧪 Testing date format: ${dateFormat}`);
      try {
        const record = await pb.collection('attendance').create({
          class_id: testClass.id,
          slot_id: testUser.assigned_slot_id,
          admin_user_id: testUser.id,
          attendance_date: dateFormat,
          total_students: 10,
          students_present: 8,
          students_absent: 1,
          students_on_leave: 1,
          notes: 'Test'
        });
        console.log(`   ✅ Success! Record ID: ${record.id}`);
        
        // Clean up
        await pb.collection('_superusers').authWithPassword(
          process.env.POCKETBASE_ADMIN_EMAIL,
          process.env.POCKETBASE_ADMIN_PASSWORD
        );
        await pb.collection('attendance').delete(record.id);
        pb.authStore.clear();
      } catch (err) {
        console.log(`   ❌ Failed: ${err.message}`);
        if (err.data) console.log(`   Details: ${JSON.stringify(err.data)}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugDateFormat();
