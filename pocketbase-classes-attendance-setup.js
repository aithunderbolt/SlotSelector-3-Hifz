/**
 * PocketBase Setup Script for Classes and Attendance Collections
 * 
 * This script creates the 'classes' and 'attendance' collections in PocketBase.
 * 
 * Run this script with: node pocketbase-classes-attendance-setup.js
 * 
 * Make sure to set your PocketBase URL and admin credentials in .env file:
 * - VITE_POCKETBASE_URL=http://127.0.0.1:8090
 * - POCKETBASE_ADMIN_EMAIL=your-admin@email.com
 * - POCKETBASE_ADMIN_PASSWORD=your-admin-password
 * 
 * If you get module errors, run: npm install
 */

import PocketBase from 'pocketbase';
import { config } from 'dotenv';

config();

const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);

async function setup() {
  try {
    console.log('Authenticating as admin...');
    await pb.admins.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL,
      process.env.POCKETBASE_ADMIN_PASSWORD
    );
    console.log('Authenticated successfully!\n');

    // Create 'classes' collection
    console.log('Creating "classes" collection...');
    try {
      await pb.collections.create({
        name: 'classes',
        type: 'base',
        schema: [
          {
            name: 'name',
            type: 'text',
            required: true,
            options: {
              min: 1,
              max: 255
            }
          },
          {
            name: 'description',
            type: 'text',
            required: false,
            options: {
              max: 2000
            }
          },
          {
            name: 'duration',
            type: 'number',
            required: true,
            options: {
              min: 1
            }
          }
        ],
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: ''
      });
      console.log('✓ "classes" collection created successfully!\n');
    } catch (err) {
      if (err.status === 400 && err.message?.includes('already exists')) {
        console.log('⚠ "classes" collection already exists, skipping...\n');
      } else {
        throw err;
      }
    }

    // Create 'attendance' collection
    console.log('Creating "attendance" collection...');
    try {
      await pb.collections.create({
        name: 'attendance',
        type: 'base',
        schema: [
          {
            name: 'class_id',
            type: 'relation',
            required: true,
            options: {
              collectionId: (await pb.collections.getOne('classes')).id,
              cascadeDelete: true,
              maxSelect: 1
            }
          },
          {
            name: 'slot_id',
            type: 'relation',
            required: true,
            options: {
              collectionId: (await pb.collections.getOne('slots')).id,
              cascadeDelete: true,
              maxSelect: 1
            }
          },
          {
            name: 'admin_user_id',
            type: 'relation',
            required: true,
            options: {
              collectionId: (await pb.collections.getOne('users')).id,
              cascadeDelete: true,
              maxSelect: 1
            }
          },
          {
            name: 'attendance_date',
            type: 'date',
            required: true
          },
          {
            name: 'total_students',
            type: 'number',
            required: true,
            options: {
              min: 0
            }
          },
          {
            name: 'students_present',
            type: 'number',
            required: true,
            options: {
              min: 0
            }
          },
          {
            name: 'students_absent',
            type: 'number',
            required: true,
            options: {
              min: 0
            }
          },
          {
            name: 'students_on_leave',
            type: 'number',
            required: true,
            options: {
              min: 0
            }
          },
          {
            name: 'notes',
            type: 'text',
            required: false,
            options: {
              max: 2000
            }
          }
        ],
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        indexes: [
          'CREATE INDEX idx_attendance_class_id ON attendance (class_id)',
          'CREATE INDEX idx_attendance_slot_id ON attendance (slot_id)',
          'CREATE INDEX idx_attendance_date ON attendance (attendance_date)',
          'CREATE INDEX idx_attendance_admin_user ON attendance (admin_user_id)'
        ]
      });
      console.log('✓ "attendance" collection created successfully!\n');
    } catch (err) {
      if (err.status === 400 && err.message?.includes('already exists')) {
        console.log('⚠ "attendance" collection already exists, skipping...\n');
      } else {
        throw err;
      }
    }

    console.log('='.repeat(50));
    console.log('Setup completed successfully!');
    console.log('='.repeat(50));
    console.log('\nNew collections created:');
    console.log('1. classes - For super admin to manage class definitions');
    console.log('2. attendance - For slot admins to track attendance\n');

  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

setup();
