/**
 * Seed script — creates default admin/staff/student accounts.
 * Run inside the container:
 *   docker exec template-node-backend node scripts/seed.js
 * Or locally (with MONGO_URI set):
 *   node scripts/seed.js
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/template-db';

const users = [
  {
    name: 'Super Administrator',
    email: 'superadmin@university.edu',
    password: 'Admin@123',
    role: 'SUPER_ADMIN',
    adminType: 'SUPER_ADMIN',
    department: 'Administration',
  },
  {
    name: 'Finance Sub Admin',
    email: 'subadmin@university.edu',
    password: 'SubAdmin@123',
    role: 'SUB_ADMIN',
    adminType: 'SUB_ADMIN',
    department: 'Finance',
  },
  {
    name: 'Dr. Sarah Connor',
    email: 'teacher@university.edu',
    password: 'Teacher@123',
    role: 'FACULTY',
    adminType: 'TEACHER',
    department: 'Computer Science',
  },
  {
    name: 'Alex Johnson',
    email: 'student@university.edu',
    prn: 'PRN2024001',
    password: 'Student@123',
    role: 'STUDENT',
    adminType: 'NONE',
    department: 'Computer Science',
  },

  // -------------------------------------------------------
  // PASSWORD MANAGEMENT DEMO ACCOUNTS
  // These accounts are ONLY for the isolated password-management
  // feature demo/testing. Do NOT use for real application access.
  // -------------------------------------------------------
  {
    name: 'First-Time Login Demo',
    email: 'firsttime@universityerp.test',
    password: '123456',
    role: 'DEMO',
    adminType: 'NONE',
    department: 'Demo',
  },
  {
    name: 'Normal Login Demo',
    email: 'login@universityerp.test',
    password: '123456',
    role: 'DEMO',
    adminType: 'NONE',
    department: 'Demo',
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB:', MONGO_URI);

    for (const userData of users) {
      const existing = await User.findOne({ email: userData.email });
      if (existing) {
        console.log(`  [SKIP] ${userData.email} already exists`);
        continue;
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      await User.create({ ...userData, password: hashedPassword });
      console.log(`  [OK]   Created: ${userData.email} (${userData.role})`);
    }

    console.log('\nSeed complete. Default credentials:');
    console.log('  Super Admin : superadmin@university.edu        /  Admin@123');
    console.log('  Sub Admin   : subadmin@university.edu          /  SubAdmin@123');
    console.log('  Teacher     : teacher@university.edu           /  Teacher@123');
    console.log('  Student PRN : PRN2024001                       /  Student@123');
    console.log('\nPassword Management Demo Accounts:');
    console.log('  First-Time  : firsttime@universityerp.test     /  123456');
    console.log('  Normal Login: login@universityerp.test         /  123456');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

seed();
