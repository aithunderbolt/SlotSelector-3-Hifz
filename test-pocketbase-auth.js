/**
 * Test PocketBase Authentication
 * 
 * This script tests if your PocketBase credentials work
 */

import PocketBase from 'pocketbase';

// Configuration - UPDATE THESE
const POCKETBASE_URL = 'https://pb.likzet.com';
const ADMIN_EMAIL = 'stealthprisms3@gmail.com';
const ADMIN_PASSWORD = 'Stealth123#';

const pb = new PocketBase(POCKETBASE_URL);

async function testAuth() {
  console.log('🧪 Testing PocketBase Authentication');
  console.log('=====================================\n');
  console.log(`URL: ${POCKETBASE_URL}`);
  console.log(`Email: ${ADMIN_EMAIL}`);
  console.log(`Password: ${'*'.repeat(ADMIN_PASSWORD.length)}\n`);

  // Test 1: Check if PocketBase is reachable
  console.log('Test 1: Checking if PocketBase is reachable...');
  try {
    const response = await fetch(`${POCKETBASE_URL}/api/health`);
    if (response.ok) {
      console.log('✅ PocketBase is reachable\n');
    } else {
      console.log('⚠️  PocketBase responded but with status:', response.status, '\n');
    }
  } catch (error) {
    console.log('❌ Cannot reach PocketBase');
    console.log('   Error:', error.message);
    console.log('   Make sure PocketBase is running!\n');
    return;
  }

  // Test 2: Check admin endpoint
  console.log('Test 2: Checking admin endpoint...');
  try {
    const response = await fetch(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Admin endpoint exists and authentication successful!');
      console.log('   Admin ID:', data.admin?.id);
      console.log('   Admin Email:', data.admin?.email);
      console.log('\n🎉 Your credentials work! You can now run the setup scripts.\n');
      return;
    } else {
      console.log('⚠️  Admin endpoint exists but auth failed');
      console.log('   Status:', response.status);
      const errorData = await response.json();
      console.log('   Error:', errorData.message);
    }
  } catch (error) {
    console.log('❌ Admin endpoint check failed:', error.message);
  }

  // Test 3: Try SDK superuser authentication
  console.log('\nTest 3: Trying SDK superuser authentication...');
  try {
    await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authentication successful!');
    console.log('   Superuser ID:', pb.authStore.model.id);
    console.log('   Superuser Email:', pb.authStore.model.email);
    console.log('\n🎉 Your credentials work! You can now run the setup scripts.\n');
  } catch (error) {
    console.log('❌ Authentication failed');
    console.log('   Status:', error.status);
    console.log('   Message:', error.message);
    console.log('   URL attempted:', error.url);
    
    if (error.status === 404) {
      console.log('\n💡 The admin API endpoint returns 404. Possible causes:');
      console.log('   1. PocketBase admin API is not enabled');
      console.log('   2. Different PocketBase version with different endpoints');
      console.log('   3. Reverse proxy configuration issue\n');
      console.log('🔧 Alternative: Create collections manually via PocketBase UI');
      console.log('   Go to: https://pb.likzet.com/_/');
      console.log('   Login with your superuser credentials');
      console.log('   Create collections manually (see POCKETBASE_SETUP.md)\n');
    } else if (error.status === 400) {
      console.log('\n💡 Wrong email or password. Please check:');
      console.log('   1. Email is correct');
      console.log('   2. Password is correct');
      console.log('   3. You\'re using the superuser credentials (not app user)\n');
    }
  }
}

testAuth();
