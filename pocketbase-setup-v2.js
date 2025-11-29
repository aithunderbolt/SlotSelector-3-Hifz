/**
 * PocketBase Collection Setup Script v2
 * 
 * Uses "fields" instead of "schema" and includes existing fields
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

      // Update with fields (include existing id field)
      slotsCollection = await pb.collections.update(slotsCollection.id, {
        fields: [
          ...slotsCollection.fields,
          { name: 'display_name', type: 'text', required: true },
          { name: 'slot_order', type: 'number', required: true },
          { name: 'max_registrations', type: 'number', required: false },
        ],
      });
      console.log('   ✅ Fields added');
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
        fields: [
          ...registrationsCollection.fields,
          { name: 'name', type: 'text', required: true },
          { name: 'email', type: 'email', required: true },
          { name: 'whatsapp_mobile', type: 'text', required: true },
          {
            name: 'slot_id',
            type: 'relation',
            required: true,
            collectionId: slotsCollection.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'fathers_name', type: 'text', required: false },
          { name: 'date_of_birth', type: 'text', required: false },
          { name: 'tajweed_level', type: 'text', required: false },
          { name: 'education', type: 'text', required: false },
          { name: 'profession', type: 'text', required: false },
          { name: 'previous_hifz', type: 'text', required: false },
        ],
      });
      console.log('   ✅ Fields added');
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
        fields: [
          ...usersCollection.fields,
          { name: 'name', type: 'text', required: false },
          { name: 'username', type: 'text', required: true },
          { name: 'email', type: 'email', required: true },
          { name: 'password', type: 'text', required: true },
          {
            name: 'role',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['super_admin', 'slot_admin'],
          },
          {
            name: 'assigned_slot_id',
            type: 'relation',
            required: false,
            collectionId: slotsCollection.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
        ],
      });
      console.log('   ✅ Fields added');
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
        fields: [
          ...settingsCollection.fields,
          { name: 'key', type: 'text', required: true },
          { name: 'value', type: 'text', required: true },
        ],
      });
      console.log('   ✅ Fields added');
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
