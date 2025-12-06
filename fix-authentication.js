import PocketBase from 'pocketbase';

const pb = new PocketBase('https://pb.likzet.com');

async function fixAuthentication() {
  try {
    console.log('Connecting to PocketBase...');
    
    // Authenticate as admin
    await pb.collection('_superusers').authWithPassword(
      'superadmin@example.com',
      'admin123'
    );
    
    console.log('Authenticated successfully\n');

    // Get the registrations collection
    const collections = await pb.collections.getFullList();
    const registrationsCollection = collections.find(c => c.name === 'registrations');
    
    if (!registrationsCollection) {
      throw new Error('Registrations collection not found');
    }

    console.log('Found registrations collection:', registrationsCollection.id);

    // Update the collection rules to allow updates without PocketBase authentication
    // Since the app manages its own authentication via the custom users table,
    // we set the rule to empty string to allow frontend updates
    await pb.collections.update(registrationsCollection.id, {
      updateRule: ''  // Empty string = allow all updates (app has its own auth layer)
    });

    console.log('✅ Successfully updated registrations collection permissions');
    console.log('Update rule is now: "" (empty - allows all updates)');
    console.log('\nRationale:');
    console.log('- The app uses a custom users table for authentication');
    console.log('- PocketBase does not handle the authentication');
    console.log('- Frontend enforces access control via the AdminDashboard component');
    console.log('- Only logged-in slot admins can access the User Transfer feature');

  } catch (error) {
    console.error('❌ Error updating permissions:', error.message);
    if (error.response) {
      console.error('Response data:', error.response);
    }
    process.exit(1);
  }
}

fixAuthentication();
