/**
 * Debug script to check collection IDs
 */

import PocketBase from 'pocketbase';
import { config } from 'dotenv';

config();

const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);

async function debugCollections() {
  try {
    console.log('🔐 Authenticating as superuser...');
    await pb.collection('_superusers').authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL,
      process.env.POCKETBASE_ADMIN_PASSWORD
    );
    console.log('✅ Authenticated\n');

    // Get all collections
    const collections = await pb.collections.getFullList();
    
    console.log('📦 Collections:');
    for (const col of collections) {
      console.log(`\n${col.name}:`);
      console.log(`  ID: ${col.id}`);
      console.log(`  Type: ${col.type}`);
    }

    // Get attendance collection and check relation fields
    console.log('\n\n📋 Attendance collection relation fields:');
    const attendance = await pb.collections.getOne('attendance');
    const fields = attendance.fields || attendance.schema;
    
    for (const field of fields) {
      if (field.type === 'relation') {
        console.log(`\n${field.name}:`);
        console.log(`  collectionId: ${field.collectionId}`);
        
        // Find the collection name
        const relatedCol = collections.find(c => c.id === field.collectionId);
        console.log(`  collection name: ${relatedCol?.name || 'NOT FOUND!'}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
  }
}

debugCollections();
