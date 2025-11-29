/**
 * Debug script to test schema update
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = 'https://pb.likzet.com';
const ADMIN_EMAIL = 'stealthprisms3@gmail.com';
const ADMIN_PASSWORD = 'Stealth123#';

const pb = new PocketBase(POCKETBASE_URL);

async function testSchemaUpdate() {
  try {
    console.log('🔐 Authenticating...');
    await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated\n');

    // Step 1: Create empty collection
    console.log('📦 Step 1: Creating empty test collection...');
    const created = await pb.collections.create({
      name: 'test_schema',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
    });
    console.log('Created collection ID:', created.id);
    console.log('Created collection fields:', JSON.stringify(created.fields, null, 2));
    console.log('');

    // Step 2: Try to update with schema
    console.log('📦 Step 2: Updating with schema...');
    const schemaData = {
      schema: [
        {
          name: 'test_field',
          type: 'text',
          required: true,
          options: { min: 1, max: 100 },
        },
      ],
    };
    console.log('Schema data to send:', JSON.stringify(schemaData, null, 2));
    
    const updated = await pb.collections.update(created.id, schemaData);
    console.log('Updated collection fields:', JSON.stringify(updated.fields, null, 2));
    console.log('');

    // Step 3: Fetch and verify
    console.log('📦 Step 3: Fetching collection to verify...');
    const fetched = await pb.collections.getOne('test_schema');
    console.log('Fetched collection fields:', JSON.stringify(fetched.fields, null, 2));
    console.log('');

    // Check if our field exists
    const hasTestField = fetched.fields?.some(f => f.name === 'test_field');
    if (hasTestField) {
      console.log('✅ SUCCESS: test_field was created!');
    } else {
      console.log('❌ FAILED: test_field was NOT created');
      console.log('');
      
      // Try alternative: use "fields" instead of "schema"
      console.log('📦 Step 4: Trying with "fields" instead of "schema"...');
      const fieldsData = {
        fields: [
          ...fetched.fields, // Keep existing fields
          {
            name: 'test_field2',
            type: 'text',
            required: true,
            options: { min: 1, max: 100 },
          },
        ],
      };
      console.log('Fields data to send:', JSON.stringify(fieldsData, null, 2));
      
      const updated2 = await pb.collections.update(created.id, fieldsData);
      console.log('Updated collection fields:', JSON.stringify(updated2.fields, null, 2));
      
      const hasTestField2 = updated2.fields?.some(f => f.name === 'test_field2');
      if (hasTestField2) {
        console.log('✅ SUCCESS: Using "fields" works!');
      } else {
        console.log('❌ FAILED: "fields" also did not work');
      }
    }

    // Clean up
    console.log('\n🧹 Cleaning up...');
    await pb.collections.delete(created.id);
    console.log('✅ Test collection deleted\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
  }
}

testSchemaUpdate();
