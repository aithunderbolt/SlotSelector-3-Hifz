/**
 * Debug script to check slot admin data
 */

import PocketBase from 'pocketbase';
import { config } from 'dotenv';

config();

const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);

async function debugSlotAdmin() {
  try {
    console.log('🔐 Authenticating as superuser...');
    await pb.collection('_superusers').authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL,
      process.env.POCKETBASE_ADMIN_PASSWORD
    );
    console.log('✅ Authenticated\n');

    // Get all slot admins
    console.log('📦 Fetching slot admins...');
    const slotAdmins = await pb.collection('users').getFullList({
      filter: 'role = "slot_admin"',
      expand: 'assigned_slot_id'
    });

    console.log(`Found ${slotAdmins.length} slot admins:\n`);
    
    for (const admin of slotAdmins) {
      console.log(`User: ${admin.username}`);
      console.log(`  ID: ${admin.id}`);
      console.log(`  assigned_slot_id: ${admin.assigned_slot_id || '(not set)'}`);
      if (admin.expand?.assigned_slot_id) {
        console.log(`  Slot name: ${admin.expand.assigned_slot_id.display_name}`);
      } else if (admin.assigned_slot_id) {
        // Try to fetch the slot directly
        try {
          const slot = await pb.collection('slots').getOne(admin.assigned_slot_id);
          console.log(`  Slot name: ${slot.display_name}`);
        } catch (e) {
          console.log(`  ⚠️ Slot not found! ID: ${admin.assigned_slot_id}`);
        }
      }
      console.log('');
    }

    // Check classes collection
    console.log('\n📦 Checking classes collection...');
    const classes = await pb.collection('classes').getFullList();
    console.log(`Found ${classes.length} classes:`);
    for (const cls of classes) {
      console.log(`  - ${cls.id}: ${cls.name}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
  }
}

debugSlotAdmin();
