/**
 * PocketBase Collection Setup Script
 * 
 * This script creates all required collections for the Registration Form App.
 * Run this after PocketBase is installed and running.
 * 
 * Usage:
 * 1. Make sure PocketBase is running
 * 2. Update POCKETBASE_URL and ADMIN_EMAIL/PASSWORD below
 * 3. Run: node pocketbase-setup.js
 */

import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration from .env
const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL;
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!POCKETBASE_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Missing environment variables!');
  console.error('Please set VITE_POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, and POCKETBASE_ADMIN_PASSWORD in .env file');
  process.exit(1);
}

const pb = new PocketBase(POCKETBASE_URL);

async function setupCollections() {
  try {
    console.log('🔐 Authenticating as superuser...');
    console.log(`   URL: ${POCKETBASE_URL}`);
    console.log(`   Email: ${ADMIN_EMAIL}`);
    
    // Try to authenticate as superuser
    try {
      await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
      console.log('✅ Authenticated successfully as superuser\n');
    } catch (authError) {
      console.log('⚠️  Superuser auth failed');
      console.log('   Error:', authError.message);
      console.log('\n❌ Authentication failed. Please check:');
      console.log('   1. PocketBase is running at:', POCKETBASE_URL);
      console.log('   2. You have created a superuser account');
      console.log('   3. Email and password are correct\n');
      console.log('💡 To create a superuser, run this in PocketBase terminal:');
      console.log(`   /app/pocketbase superuser create ${ADMIN_EMAIL} ${ADMIN_PASSWORD}\n`);
      throw authError;
    }

    // Create slots collection
    console.log('📦 Creating "slots" collection...');
    let slotsCollection;
    try {
      slotsCollection = await pb.collections.create({
      name: 'slots',
      type: 'base',
      schema: [
        {
          name: 'display_name',
          type: 'text',
          required: true,
          options: {
            min: 1,
            max: 500,
          },
        },
        {
          name: 'slot_order',
          type: 'number',
          required: true,
          options: {
            min: 1,
          },
        },
        {
          name: 'max_registrations',
          type: 'number',
          required: false,
          options: {
            min: 1,
            max: 100,
          },
        },
      ],
      indexes: [],
      listRule: '',
      viewRule: '',
      createRule: null,
      updateRule: '',
      deleteRule: null,
      options: {},
    });
      console.log('✅ "slots" collection created\n');
    } catch (error) {
      if (error.data?.data?.name?.code === 'validation_collection_name_exists') {
        console.log('⚠️  "slots" collection already exists, skipping...\n');
        slotsCollection = await pb.collections.getOne('slots');
      } else {
        throw error;
      }
    }

    // Get slots collection ID for relations
    console.log(`   Slots collection ID: ${slotsCollection.id}\n`);

    // Create registrations collection
    console.log('📦 Creating "registrations" collection...');
    try {
      await pb.collections.create({
      name: 'registrations',
      type: 'base',
      schema: [
        {
          name: 'name',
          type: 'text',
          required: true,
          options: {
            min: 1,
            max: 200,
          },
        },
        {
          name: 'email',
          type: 'email',
          required: true,
          options: {},
        },
        {
          name: 'whatsapp_mobile',
          type: 'text',
          required: true,
          options: {
            min: 10,
            max: 20,
          },
        },
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
        {
          name: 'fathers_name',
          type: 'text',
          required: false,
          options: {
            max: 200,
          },
        },
        {
          name: 'date_of_birth',
          type: 'text',
          required: false,
          options: {
            max: 10,
          },
        },
        {
          name: 'tajweed_level',
          type: 'text',
          required: false,
          options: {
            max: 50,
          },
        },
        {
          name: 'education',
          type: 'text',
          required: false,
          options: {
            max: 200,
          },
        },
        {
          name: 'profession',
          type: 'text',
          required: false,
          options: {
            max: 200,
          },
        },
        {
          name: 'previous_hifz',
          type: 'text',
          required: false,
          options: {
            max: 1000,
          },
        },
      ],
      indexes: [],
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: null,
      deleteRule: null,
      options: {},
    });
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
      await pb.collections.create({
      name: 'users',
      type: 'base',
      schema: [
        {
          name: 'name',
          type: 'text',
          required: false,
          options: {
            max: 200,
          },
        },
        {
          name: 'username',
          type: 'text',
          required: true,
          options: {
            min: 3,
            max: 50,
          },
        },
        {
          name: 'password',
          type: 'text',
          required: true,
          options: {
            min: 6,
            max: 200,
          },
        },
        {
          name: 'role',
          type: 'select',
          required: true,
          options: {
            maxSelect: 1,
            values: ['super_admin', 'slot_admin'],
          },
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
      indexes: [],
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      options: {},
    });
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
      await pb.collections.create({
      name: 'settings',
      type: 'base',
      schema: [
        {
          name: 'key',
          type: 'text',
          required: true,
          options: {
            min: 1,
            max: 100,
          },
        },
        {
          name: 'value',
          type: 'text',
          required: true,
          options: {
            max: 1000,
          },
        },
      ],
      indexes: [],
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: null,
      options: {},
    });
      console.log('✅ "settings" collection created\n');
    } catch (error) {
      if (error.data?.data?.name?.code === 'validation_collection_name_exists') {
        console.log('⚠️  "settings" collection already exists, skipping...\n');
      } else {
        throw error;
      }
    }

    console.log('🎉 All collections created successfully!\n');
    console.log('📝 Next steps:');
    console.log('   1. Run: node pocketbase-seed.js (to add initial data)');
    console.log('   2. Or manually add data via PocketBase admin UI\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the setup
setupCollections();
