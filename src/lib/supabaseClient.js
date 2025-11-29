import PocketBase from 'pocketbase';

const pocketbaseUrl = import.meta.env.VITE_POCKETBASE_URL;

if (!pocketbaseUrl) {
  throw new Error('Missing PocketBase environment variable');
}

export const pb = new PocketBase(pocketbaseUrl);

// Disable auto cancellation for better compatibility
pb.autoCancellation(false);
