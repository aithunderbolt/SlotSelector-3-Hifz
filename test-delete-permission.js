/**
 * Test delete permission for slot admin
 */

import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

dotenv.config();

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL;

const pb = new PocketBase(POCKETBASE_URL);

async function testDeletePermission() {
  try {
    console.log('🔍 Testing delete permission for slot admin...\n');

    // First, authenticate as superuser to check the collection rules
    console.log('🔐 Authenticating as superuser to check rules...');
    await pb.collection('_superusers').authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL,
      process.env.POCKETBASE_ADMIN_PASSWORD
    );
    
    const collections = await pb.collections.getFullList();
    const registrationsCollection = collections.find(c => c.name === 'registrations');
    
    console.log('📋 Current registrations collection rules:');
    console.log('   listRule:', registrationsCollection.listRule || '(empty - public)');
    console.log('   viewRule:', registrationsCollection.viewRule || '(empty - public)');
    console.log('   createRule:', registrationsCollection.createRule || '(empty - public)');
    console.log('   updateRule:', registrationsCollection.updateRule || 'null (superuser only)');
    console.log('   deleteRule:', registrationsCollection.deleteRule || 'null (superuser only)');
    console.log('');

    // Get a slot admin user
    const slotAdmins = await pb.collection('users').getFullList({
      filter: 'role = "slot_admin"',
    });

    if (slotAdmins.length === 0) {
      console.log('❌ No slot admin users found');
      return;
    }

    const slotAdmin = slotAdmins[0];
    console.log('👤 Found slot admin:', slotAdmin.username);
    console.log('   Assigned slot ID:', slotAdmin.assigned_slot_id);
    console.log('');

    // Get a registration from that slot
    const registrations = await pb.collection('registrations').getFullList({
      filter: `slot_id = "${slotAdmin.assigned_slot_id}"`,
    });

    if (registrations.length === 0) {
      console.log('❌ No registrations found for this slot');
      return;
    }

    const testReg = registrations[0];
    console.log('📝 Found test registration:', testReg.id);
    console.log('   Name:', testReg.name);
    console.log('   Slot ID:', testReg.slot_id);
    console.log('');

    console.log('⚠️  NOT attempting to delete - only checking permissions');
    console.log('');
    
    console.log('🔍 Checking if the delete rule is correct...');
    const expectedRule = '@request.auth.id != "" && (@request.auth.role = "super_admin" || (@request.auth.role = "slot_admin" && @request.auth.assigned_slot_id = slot_id))';
    
    if (registrationsCollection.deleteRule === expectedRule) {
      console.log('✅ Delete rule is correctly set');
    } else {
      console.log('❌ Delete rule does not match expected rule');
      console.log('   Expected:', expectedRule);
      console.log('   Actual:', registrationsCollection.deleteRule);
    }
    console.log('');

    // Check if the users collection has the correct fields
    const usersCollection = collections.find(c => c.name === 'users');
    console.log('👥 Users collection schema:');
    if (usersCollection.schema) {
      console.log('   Fields:', usersCollection.schema.map(f => f.name).join(', '));
    } else if (usersCollection.fields) {
      console.log('   Fields:', usersCollection.fields.map(f => f.name).join(', '));
    } else {
      console.log('   Schema structure:', Object.keys(usersCollection));
    }
    console.log('');

    // Verify the slot admin has the required fields
    console.log('🔍 Verifying slot admin record:');
    console.log('   Has role field:', slotAdmin.role !== undefined);
    console.log('   Role value:', slotAdmin.role);
    console.log('   Has assigned_slot_id:', slotAdmin.assigned_slot_id !== undefined);
    console.log('   Assigned slot ID:', slotAdmin.assigned_slot_id);
    console.log('');

    console.log('💡 Suggestion: The issue might be that the frontend authentication');
    console.log('   is not properly setting the auth context. Check if pb.authStore.model');
    console.log('   contains the role and assigned_slot_id fields after login.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
  }
}

testDeletePermission();
