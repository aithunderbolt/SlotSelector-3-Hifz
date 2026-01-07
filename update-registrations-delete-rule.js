/**
 * Update registrations collection to allow slot admins to delete
 * registrations from their assigned slot
 */

import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

dotenv.config();

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL;
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(POCKETBASE_URL);

async function updateDeleteRule() {
  try {
    console.log('🔐 Authenticating as superuser...');
    await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated successfully\n');

    console.log('📝 Updating registrations collection delete rule...');
    
    // Get the registrations collection
    const collections = await pb.collections.getFullList();
    const registrationsCollection = collections.find(c => c.name === 'registrations');
    
    if (!registrationsCollection) {
      throw new Error('Registrations collection not found');
    }

    // Update the delete rule to allow slot admins to delete registrations from their slot
    // Rule: Allow if user is authenticated AND (is super_admin OR is slot_admin for this slot)
    const deleteRule = '@request.auth.id != "" && (@request.auth.role = "super_admin" || (@request.auth.role = "slot_admin" && @request.auth.assigned_slot_id = slot_id))';
    
    await pb.collections.update(registrationsCollection.id, {
      deleteRule: deleteRule
    });

    console.log('✅ Delete rule updated successfully!');
    console.log('📋 New delete rule:', deleteRule);
    console.log('\n✨ Slot admins can now delete registrations from their assigned slot\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

updateDeleteRule();
