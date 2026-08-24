const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const User = require('../models/User');

require('dotenv').config();
const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../../.env')
});

const bcrypt = require('bcryptjs');

const AuditLog = require('../models/AuditLog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/template-db';

const seedDatabase = async () => {
  try {
    console.log(process.env.MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding...');



    const Role = require('../models/Role');

    // Clear existing sample users and roles if needed
    await User.deleteMany({});
    await AuditLog.deleteMany({});
    await Role.deleteMany({});

    const defaultRoles = [
      {
        name: 'Super Administrator',
        code: 'SUPER_ADMIN',
        description: 'Complete university system governance, security, and global configuration access.',
        category: 'ADMIN',
        permissions: ['all_access', 'manage_users', 'manage_roles', 'manage_departments', 'view_audit_logs', 'system_config'],
        isSystemRole: true,
      },
      {
        name: 'Sub Administrator',
        code: 'SUB_ADMIN',
        description: 'Departmental management, staff administration, and operational reporting.',
        category: 'ADMIN',
        permissions: ['manage_users', 'manage_departments', 'view_reports', 'manage_attendance'],
        isSystemRole: true,
      },
      {
        name: 'Faculty / Professor',
        code: 'FACULTY',
        description: 'Course management, syllabus updates, attendance tracking, and student assessments.',
        category: 'ACADEMIC',
        permissions: ['manage_courses', 'grade_assignments', 'mark_attendance', 'view_students'],
        isSystemRole: true,
      },
      {
        name: 'University Student',
        code: 'STUDENT',
        description: 'Access to enrolled courses, academic schedule, assignment submission, and grade reports.',
        category: 'STUDENT',
        permissions: ['view_courses', 'submit_assignments', 'view_grades', 'view_schedule'],
        isSystemRole: true,
      },
      {
        name: 'Finance & Accounts Officer',
        code: 'FINANCE',
        description: 'Student fee management, payment receipt reconciliation, and faculty payroll reports.',
        category: 'STAFF',
        permissions: ['manage_fees', 'generate_invoices', 'view_financial_reports'],
        isSystemRole: true,
      },
      {
        name: 'Library Administrator',
        code: 'LIBRARIAN',
        description: 'Library catalogue management, book issue/return tracking, and overdue fine collection.',
        category: 'STAFF',
        permissions: ['manage_library', 'issue_books', 'view_students'],
        isSystemRole: false,
      },
      {
        name: 'Examination Controller',
        code: 'EXAM_CONTROLLER',
        description: 'Exam timetable scheduling, hall ticket generation, and final result verification.',
        category: 'ACADEMIC',
        permissions: ['manage_exams', 'publish_results', 'view_students', 'manage_grades'],
        isSystemRole: false,
      },
    ];

    await Role.insertMany(defaultRoles);
    console.log('Default system and staff roles seeded in MongoDB.');

    const defaultPassword = await bcrypt.hash('Admin@123', 10);
    const studentPassword = await bcrypt.hash('Student@123', 10);
    const subAdminPassword = await bcrypt.hash('SubAdmin@123', 10);
    const teacherPassword = await bcrypt.hash('Teacher@123', 10);

    const users = [
      {
        name: 'Super Admin User',
        email: 'superadmin@university.edu',
        password: defaultPassword,
        role: 'SUPER_ADMIN',
        adminType: 'SUPER_ADMIN',
        department: 'Administration',
      },
      {
        name: 'Finance Sub Admin',
        email: 'subadmin@university.edu',
        password: subAdminPassword,
        role: 'SUB_ADMIN',
        adminType: 'SUB_ADMIN',
        department: 'Finance & Accounts',
      },
      {
        name: 'Professor John Doe',
        email: 'teacher@university.edu',
        password: teacherPassword,
        role: 'FACULTY',
        adminType: 'TEACHER',
        department: 'Computer Science',
      },
      {
        name: 'Alex Johnson',
        email: 'student@university.edu',
        prn: 'PRN2026001',
        password: studentPassword,
        role: 'STUDENT',
        adminType: 'NONE',
        department: 'Computer Science',
      },
    ];

    await User.insertMany(users);
    console.log('Sample users seeded successfully.');

    await AuditLog.create({
      action: 'SYSTEM_INITIALIZED',
      performedBy: 'System Seed Script',
      target: 'Database',
      status: 'SUCCESS',
      details: 'Seeded initial accounts and standard university roles',
    });

    process.exit(0);
  } catch (error) {
    console.error('Seeding Error Details:', error.message);
    process.exit(1);
  }
};

seedDatabase();


