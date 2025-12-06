import PocketBase from 'pocketbase';

const pb = new PocketBase('https://pb.likzet.com');

async function updateRegistrationPermissions() {
  try {
    console.log('Connecting to PocketBase...');
    
    // Authenticate as admin
    await pb.collection('_superusers').authWithPassword(
      'superadmin@example.com',
      'admin123'
    );
    
    console.log('Authenticated successfully');

    // Get the registrations collection
    const collections = await pb.collections.getFullList();
    const registrationsCollection = collections.find(c => c.name === 'registrations');
    
    if (!registrationsCollection) {
      throw new Error('Registrations collection not found');
    }

    console.log('Found registrations collection:', registrationsCollection.id);

    // Update the collection rules to allow slot admins to update registrations
    // Rule explanation: Allow authenticated users (slot admins and super admins) to update
    await pb.collections.update(registrationsCollection.id, {
      updateRule: '@request.auth.id != ""'
    });

    console.log('✅ Successfully updated registrations collection permissions');
    console.log('Slot admins can now update registrations (transfer users)');

  } catch (error) {
    console.error('❌ Error updating permissions:', error.message);
    if (error.response) {
      console.error('Response data:', error.response);
    }
    process.exit(1);
  }
}

updateRegistrationPermissions();
