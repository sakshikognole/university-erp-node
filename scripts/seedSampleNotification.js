/**
 * Seed a sample system announcement (notification) for testing.
 * Usage: node scripts/seedSampleNotification.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const SystemAnnouncement = require('../models/SystemAnnouncement');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/university_erp';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const existing = await SystemAnnouncement.findOne({ announcementId: 'SA-TEST-001' });
    if (existing) {
      console.log('Sample notification already exists — skipping.');
      await mongoose.disconnect();
      return;
    }

    const sample = await SystemAnnouncement.create({
      announcementId: 'SA-TEST-001',
      title: 'Welcome to University ERP – System Test Notification',
      description:
        'This is a sample notification to verify the notifications feature is working correctly. ' +
        'All students, staff, and administrators should be able to see this announcement. ' +
        'If you can read this, the notification system is functioning properly!',
      departments: [],
      createdBy: null,
    });

    console.log('Sample notification created:', sample.announcementId, '—', sample.title);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();
