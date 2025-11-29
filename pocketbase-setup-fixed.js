/**
 * PocketBase Collection Setup Script (FIXED)
 * 
 * This uses a two-step process:
 * 1. Create collection
 * 2. Update collection with schema
 */

import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

dotenv.config();

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL;
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(POCKETBASE_URL);

async function setupCollections() {
  try {
    console.log('🔐 Authenticating as superuser...');
    await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated successfully\n');

    // Create slots collection
    console.log('📦 Creating "slots" collection...');
    let slotsCollection;
    try {
      // Step 1: Create empty collection
      slotsCollection = await pb.collections.create({
        name: 'slots',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: null,
        updateRule: '',
        deleteRule: null,
      });
      console.log('   ✅ Collection created');

      // Step 2: Update with schema
      slotsCollection = await pb.collections.update(slotsCollection.id, {
        schema: [
          {
            name: 'display_name',
            type: 'text',
            required: true,
            options: { min: 1, max: 500 },
          },
          {
            name: 'slot_order',
            type: 'number',
            required: true,
            options: { min: 1 },
          },
          {
            name: 'max_registrations',
            type: 'number',
            required: false,
            options: { min: 1, max: 100 },
          },
        ],
      });
      console.log('   ✅ Schema added');
      console.log('✅ "slots" collection created\n');
    } catch (error) {
      if (error.data?.data?.name?.code === 'validation_collection_name_exists') {
        console.log('⚠️  "slots" collection already exists, fetching...\n');
        slotsCollection = await pb.collections.getOne('slots');
      } else {
        throw error;
      }
    }

    // Create registrations collection
    console.log('📦 Creating "registrations" collection...');
    try {
      let registrationsCollection = await pb.collections.create({
        name: 'registrations',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: null,
        deleteRule: null,
      });
      console.log('   ✅ Collection created');

      registrationsCollection = await pb.collections.update(registrationsCollection.id, {
        schema: [
          { name: 'name', type: 'text', required: true, options: { min: 1, max: 200 } },
          { name: 'email', type: 'email', required: true, options: {} },
          { name: 'whatsapp_mobile', type: 'text', required: true, options: { min: 10, max: 20 } },
          {
            name: 'slot_id',
            type: 'relation',
            required: true,
            options: {
              collectionId: slotsCollection.id,
              cascadeDelete: false,
              minSelect: null,
              maxSelect: 1,
              displayFields: ['display_name'],
            },
          },
          { name: 'fathers_name', type: 'text', required: false, options: { max: 200 } },
          { name: 'date_of_birth', type: 'text', required: false, options: { max: 10 } },
          { name: 'tajweed_level', type: 'text', required: false, options: { max: 50 } },
          { name: 'education', type: 'text', required: false, options: { max: 200 } },
          { name: 'profession', type: 'text', required: false, options: { max: 200 } },
          { name: 'previous_hifz', type: 'text', required: false, options: { max: 1000 } },
        ],
      });
      console.log('   ✅ Schema added');
      console.log('✅ "registrations" collection created\n');
    } catch (error) {
      if (error.data?.data?.name?.code === 'validation_collection_name_exists') {
        console.log('⚠️  "registrations" collection already exists, skipping...\n');
      } else {
        throw error;
      }
    }

    // Create users collection
    console.log('📦 Creating "users" collection...');
    try {
      let usersCollection = await pb.collections.create({
        name: 'users',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
      });
      console.log('   ✅ Collection created');

      usersCollection = await pb.collections.update(usersCollection.id, {
        schema: [
          { name: 'name', type: 'text', required: false, options: { max: 200 } },
          { name: 'username', type: 'text', required: true, options: { min: 3, max: 50 } },
          { name: 'email', type: 'email', required: true, options: {} },
          { name: 'password', type: 'text', required: true, options: { min: 6, max: 200 } },
          {
            name: 'role',
            type: 'select',
            required: true,
            options: { maxSelect: 1, values: ['super_admin', 'slot_admin'] },
          },
          {
            name: 'assigned_slot_id',
            type: 'relation',
            required: false,
            options: {
              collectionId: slotsCollection.id,
              cascadeDelete: false,
              minSelect: null,
              maxSelect: 1,
              displayFields: ['display_name'],
            },
          },
        ],
      });
      console.log('   ✅ Schema added');
      console.log('✅ "users" collection created\n');
    } catch (error) {
      if (error.data?.data?.name?.code === 'validation_collection_name_exists') {
        console.log('⚠️  "users" collection already exists, skipping...\n');
      } else {
        throw error;
      }
    }

    // Create settings collection
    console.log('📦 Creating "settings" collection...');
    try {
      let settingsCollection = await pb.collections.create({
        name: 'settings',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: null,
      });
      console.log('   ✅ Collection created');

      settingsCollection = await pb.collections.update(settingsCollection.id, {
        schema: [
          { name: 'key', type: 'text', required: true, options: { min: 1, max: 100 } },
          { name: 'value', type: 'text', required: true, options: { max: 1000 } },
        ],
      });
      console.log('   ✅ Schema added');
      console.log('✅ "settings" collection created\n');
    } catch (error) {
      if (error.data?.data?.name?.code === 'validation_collection_name_exists') {
        console.log('⚠️  "settings" collection already exists, skipping...\n');
      } else {
        throw error;
      }
    }

    console.log('🎉 All collections created successfully!\n');
    console.log('📝 Next step: Run node pocketbase-seed.js\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

setupCollections();
