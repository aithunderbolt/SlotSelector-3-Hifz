import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

dotenv.config();

const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);

async function addRegisteredAtField() {
  try {
    // Authenticate as admin
    await pb.admins.authWithPassword(
      process.env.VITE_POCKETBASE_ADMIN_EMAIL,
      process.env.VITE_POCKETBASE_ADMIN_PASSWORD
    );

    console.log('Authenticated as admin');

    // Get the registrations collection
    const collections = await pb.collections.getFullList();
    const registrationsCollection = collections.find(c => c.name === 'registrations');

    if (!registrationsCollection) {
      console.error('Registrations collection not found');
      return;
    }

    console.log('Found registrations collection:', registrationsCollection.id);

    // Add the registered_at field to the schema
    const updatedSchema = [
      ...registrationsCollection.schema,
      {
        name: 'registered_at',
        type: 'date',
        system: false,
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: '',
          max: ''
        }
      }
    ];

    // Update the collection with the new field
    await pb.collections.update(registrationsCollection.id, {
      schema: updatedSchema
    });

    console.log('Added registered_at field to registrations collection');

    // Get all existing registrations and set their registered_at to current time
    const registrations = await pb.collection('registrations').getFullList();
    console.log(`Found ${registrations.length} existing registrations`);

    for (const reg of registrations) {
      // Set registered_at to current time for existing records
      await pb.collection('registrations').update(reg.id, {
        registered_at: new Date().toISOString()
      });
      console.log(`Updated registration ${reg.id}`);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

addRegisteredAtField();
