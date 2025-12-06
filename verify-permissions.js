import PocketBase from 'pocketbase';

const pb = new PocketBase('https://pb.likzet.com');

async function verifyPermissions() {
  try {
    console.log('Connecting to PocketBase...');
    
    // Authenticate as admin
    await pb.collection('_superusers').authWithPassword(
      'superadmin@example.com',
      'admin123'
    );
    
    console.log('Authenticated successfully\n');

    // Get all collections and their rules
    const collections = await pb.collections.getFullList();
    
    console.log('Collection Permissions:\n');
    console.log('='.repeat(80));
    
    collections.forEach(collection => {
      if (['registrations', 'slots', 'users', 'settings'].includes(collection.name)) {
        console.log(`\n📁 ${collection.name.toUpperCase()}`);
        console.log('-'.repeat(80));
        console.log(`List Rule:   ${collection.listRule || '(empty - anyone can list)'}`);
        console.log(`View Rule:   ${collection.viewRule || '(empty - anyone can view)'}`);
        console.log(`Create Rule: ${collection.createRule === null ? '(null - only admins)' : collection.createRule || '(empty - anyone can create)'}`);
        console.log(`Update Rule: ${collection.updateRule === null ? '(null - only admins)' : collection.updateRule || '(empty - anyone can update)'}`);
        console.log(`Delete Rule: ${collection.deleteRule === null ? '(null - only admins)' : collection.deleteRule || '(empty - anyone can delete)'}`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Verification complete');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyPermissions();
