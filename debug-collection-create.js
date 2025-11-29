/**
 * Debug script to test collection creation
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = 'https://pb.likzet.com';
const ADMIN_EMAIL = 'stealthprisms3@gmail.com';
const ADMIN_PASSWORD = 'Stealth123#';

const pb = new PocketBase(POCKETBASE_URL);

async function testCollectionCreate() {
  try {
    console.log('🔐 Authenticating...');
    await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated\n');

    // Test creating a simple collection
    console.log('📦 Creating test collection...');
    const collectionData = {
      name: 'test_debug',
      type: 'base',
      schema: [
        {
          name: 'test_field',
          type: 'text',
          required: true,
          options: {
            min: 1,
            max: 100,
          },
        },
      ],
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
    };

    console.log('Collection data to send:');
    console.log(JSON.stringify(collectionData, null, 2));
    console.log('');

    const result = await pb.collections.create(collectionData);
    
    console.log('✅ Collection created!');
    console.log('Result:');
    console.log(JSON.stringify(result, null, 2));
    console.log('');

    // Verify the collection
    console.log('🔍 Fetching created collection...');
    const fetchedCollection = await pb.collections.getOne('test_debug');
    console.log('Fetched collection schema:');
    console.log(JSON.stringify(fetchedCollection.schema, null, 2));
    console.log('');

    // Check if schema field exists
    if (fetchedCollection.schema && fetchedCollection.schema.length > 0) {
      console.log('✅ Schema fields were created successfully!');
      console.log(`   Found ${fetchedCollection.schema.length} field(s)`);
    } else {
      console.log('❌ Schema fields were NOT created!');
      console.log('   This is the bug we need to fix.');
    }

    // Clean up
    console.log('\n🧹 Cleaning up test collection...');
    await pb.collections.delete(fetchedCollection.id);
    console.log('✅ Test collection deleted\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
    if (error.response) {
      console.error('Response:', await error.response.text());
    }
  }
}

testCollectionCreate();
