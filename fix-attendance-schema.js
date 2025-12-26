/**
 * Fix attendance collection schema - make all number fields accept 0
 */

import PocketBase from 'pocketbase';
import { config } from 'dotenv';

config();

const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);

async function fixAttendanceSchema() {
  try {
    console.log('🔐 Authenticating as superuser...');
    await pb.collection('_superusers').authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL,
      process.env.POCKETBASE_ADMIN_PASSWORD
    );
    console.log('✅ Authenticated\n');

    const collection = await pb.collections.getOne('attendance');
    
    // Fields that should accept 0
    const fieldsToFix = ['students_present', 'students_absent', 'students_on_leave'];
    
    console.log('📋 Current field settings:');
    for (const fieldName of fieldsToFix) {
      const field = collection.fields.find(f => f.name === fieldName);
      console.log(`  ${fieldName}: required=${field?.required}`);
    }

    // Update all number fields to not be required (allow 0)
    const updatedFields = collection.fields.map(f => {
      if (fieldsToFix.includes(f.name)) {
        return {
          ...f,
          required: false,
          min: null
        };
      }
      return f;
    });

    console.log('\n🔧 Updating schema...');
    await pb.collections.update(collection.id, { fields: updatedFields });

    console.log('✅ Schema updated!\n');

    // Verify
    const updated = await pb.collections.getOne('attendance');
    console.log('📋 Updated field settings:');
    for (const fieldName of fieldsToFix) {
      const field = updated.fields.find(f => f.name === fieldName);
      console.log(`  ${fieldName}: required=${field?.required}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
  }
}

fixAttendanceSchema();
