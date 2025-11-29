/**
 * PocketBase Data Seeding Script
 * 
 * This script adds initial data to your PocketBase collections.
 * Run this after creating collections with pocketbase-setup.js
 * 
 * Usage:
 * 1. Make sure collections are created (run pocketbase-setup.js first)
 * 2. Update POCKETBASE_URL and ADMIN_EMAIL/PASSWORD below
 * 3. Run: node pocketbase-seed.js
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

async function seedData() {
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

    // Seed slots
    console.log('📦 Adding slots...');
    const slots = [];
    for (let i = 1; i <= 10; i++) {
      try {
        const slot = await pb.collection('slots').create({
          display_name: `Slot ${i}`,
          slot_order: i,
          max_registrations: 15,
        });
        slots.push(slot);
        console.log(`   ✅ Created: Slot ${i}`);
      } catch (error) {
        if (error.data?.data?.display_name?.code === 'validation_not_unique') {
          console.log(`   ⚠️  Slot ${i} already exists, skipping...`);
          const existingSlots = await pb.collection('slots').getFullList({
            filter: `slot_order = ${i}`,
          });
          if (existingSlots.length > 0) {
            slots.push(existingSlots[0]);
          }
        } else {
          throw error;
        }
      }
    }
    console.log('✅ Slots added\n');

    // Seed super admin user
    console.log('📦 Adding super admin user...');
    try {
      await pb.collection('users').create({
        name: 'Super Admin',
        username: 'superadmin',
        email: 'superadmin@example.com',
        password: 'admin123',
        passwordConfirm: 'admin123',
        role: 'super_admin',
      });
      console.log('   ✅ Created: superadmin (password: admin123)');
    } catch (error) {
      if (error.data?.data?.username?.code === 'validation_not_unique' || error.data?.data?.email?.code === 'validation_not_unique') {
        console.log('   ⚠️  Super admin already exists, skipping...');
      } else {
        throw error;
      }
    }
    console.log('✅ Super admin user added\n');

    // Seed slot admin users (optional)
    console.log('📦 Adding slot admin users...');
    for (let i = 1; i <= 3; i++) {
      try {
        if (slots[i - 1]) {
          await pb.collection('users').create({
            name: `Slot ${i} Admin`,
            username: `slot${i}admin`,
            email: `slot${i}admin@example.com`,
            password: `slot${i}pass`,
            passwordConfirm: `slot${i}pass`,
            role: 'slot_admin',
            assigned_slot_id: slots[i - 1].id,
          });
          console.log(`   ✅ Created: slot${i}admin (password: slot${i}pass)`);
        }
      } catch (error) {
        if (error.data?.data?.username?.code === 'validation_not_unique' || error.data?.data?.email?.code === 'validation_not_unique') {
          console.log(`   ⚠️  slot${i}admin already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }
    console.log('✅ Slot admin users added\n');

    // Seed settings
    console.log('📦 Adding settings...');
    const settings = [
      { key: 'form_title', value: 'Hifz Registration Form' },
      { key: 'max_registrations_per_slot', value: '15' },
    ];

    for (const setting of settings) {
      try {
        await pb.collection('settings').create(setting);
        console.log(`   ✅ Created: ${setting.key}`);
      } catch (error) {
        if (error.data?.data?.key?.code === 'validation_not_unique') {
          console.log(`   ⚠️  ${setting.key} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }
    console.log('✅ Settings added\n');

    console.log('🎉 All data seeded successfully!\n');
    console.log('📝 Summary:');
    console.log(`   - ${slots.length} slots created`);
    console.log('   - 1 super admin user (superadmin/admin123)');
    console.log('   - 3 slot admin users (slot1admin/slot1pass, etc.)');
    console.log('   - 2 settings configured\n');
    console.log('🚀 You can now run your React app with: npm run dev\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the seeding
seedData();
