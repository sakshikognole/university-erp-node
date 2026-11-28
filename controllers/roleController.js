const Role     = require('../models/Role');
const User     = require('../models/User');
const AuditLog = require('../models/AuditLog');

// ─────────────────────────────────────────────────────────────────────────────
// TEACHER page permissions — the 13 pages assigned to the Teacher role
// ─────────────────────────────────────────────────────────────────────────────
const TEACHER_ALLOWED_PAGES = [
  '/submissions',
  '/academic-resources',
  '/announcements',
  '/email-communication',
  '/attendance',
  '/system-announcements',
  '/system-announcements-board',
  '/event-notices',
  '/event-notices-board',
  '/schedules',
  '/subjects',
  '/exams',
  '/upload-materials',
  '/display-materials',
  '/books',
  '/students',
  '/dashboard',
];

// Initial default system roles seed
const defaultSystemRoles = [
  {
    name: 'Super Administrator',
    code: 'SUPER_ADMIN',
    description: 'Complete university system governance, security, and global configuration access.',
    category: 'ADMIN',
    permissions: ['all_access', 'manage_users', 'manage_roles', 'manage_departments', 'view_audit_logs', 'system_config'],
    allowedPages: [], // empty = unrestricted
    isSystemRole: true,
  },
  {
    name: 'Sub Administrator',
    code: 'SUB_ADMIN',
    description: 'Departmental management, staff administration, and operational reporting.',
    category: 'ADMIN',
    permissions: ['manage_users', 'manage_departments', 'view_reports', 'manage_attendance'],
    allowedPages: [],
    isSystemRole: true,
  },
  {
    name: 'Teacher',
    code: 'TEACHER',
    description: 'Classroom instruction, attendance marking, and student assessment.',
    category: 'ACADEMIC',
    permissions: ['mark_attendance', 'view_students', 'manage_courses', 'grade_assignments'],
    allowedPages: TEACHER_ALLOWED_PAGES,
    isSystemRole: true,
  },
  {
    name: 'Faculty / Professor',
    code: 'FACULTY',
    description: 'Course management, syllabus updates, attendance tracking, and student assessments.',
    category: 'ACADEMIC',
    permissions: ['manage_courses', 'grade_assignments', 'mark_attendance', 'view_students'],
    allowedPages: TEACHER_ALLOWED_PAGES,
    isSystemRole: true,
  },
  {
    name: 'University Student',
    code: 'STUDENT',
    description: 'Access to enrolled courses, academic schedule, assignment submission, and grade reports.',
    category: 'STUDENT',
    permissions: ['view_courses', 'submit_assignments', 'view_grades', 'view_schedule'],
    allowedPages: [],
    isSystemRole: true,
  },
  {
    name: 'Finance & Accounts Officer',
    code: 'FINANCE',
    description: 'Student fee management, payment receipt reconciliation, and faculty payroll reports.',
    category: 'STAFF',
    permissions: ['manage_fees', 'generate_invoices', 'view_financial_reports'],
    allowedPages: [],
    isSystemRole: true,
  },
];

// Helper to ensure initial system roles exist in MongoDB
const ensureDefaultRoles = async () => {
  const count = await Role.countDocuments();
  if (count === 0) {
    await Role.insertMany(defaultSystemRoles);
  } else {
    // Ensure TEACHER role exists and has correct allowedPages (migration-safe)
    const teacherRole = await Role.findOne({ code: 'TEACHER' });
    if (teacherRole) {
      if (!teacherRole.allowedPages || teacherRole.allowedPages.length === 0) {
        await Role.updateOne(
          { code: 'TEACHER' },
          { $set: { allowedPages: TEACHER_ALLOWED_PAGES } }
        );
      }
    } else {
      await Role.create(defaultSystemRoles.find((r) => r.code === 'TEACHER'));
    }

    // Ensure FACULTY role has allowedPages too
    const facultyRole = await Role.findOne({ code: 'FACULTY' });
    if (facultyRole && (!facultyRole.allowedPages || facultyRole.allowedPages.length === 0)) {
      await Role.updateOne(
        { code: 'FACULTY' },
        { $set: { allowedPages: TEACHER_ALLOWED_PAGES } }
      );
    }
  }
};

exports.ensureDefaultRoles = ensureDefaultRoles;
exports.defaultSystemRoles = defaultSystemRoles;
exports.TEACHER_ALLOWED_PAGES = TEACHER_ALLOWED_PAGES;

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/roles  — list all roles with live user counts
// ─────────────────────────────────────────────────────────────────────────────
exports.getRoles = async (req, res) => {
  try {
    await ensureDefaultRoles();

    const roles = await Role.find().sort({ isSystemRole: -1, createdAt: 1 });

    // Aggregate user counts per role code
    const userRoleCounts = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    userRoleCounts.forEach((item) => {
      countMap[item._id] = item.count;
    });

    const enrichedRoles = roles.map((role) => {
      const roleObj = role.toObject();
      roleObj.userCount = countMap[role.code] || 0;
      return roleObj;
    });

    return res.status(200).json(enrichedRoles);
  } catch (error) {
    console.error('Get Roles Error:', error);
    return res.status(500).json({ message: 'Error fetching roles from database' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/roles  — create a new custom role
// ─────────────────────────────────────────────────────────────────────────────
exports.createRole = async (req, res) => {
  try {
    const { name, code, description, category, permissions, allowedPages } = req.body;

    if (!name || !code) {
      return res.status(400).json({ message: 'Role name and role code are required' });
    }

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '_');

    const existingRole = await Role.findOne({ code: cleanCode });
    if (existingRole) {
      return res.status(409).json({ message: `A role with code '${cleanCode}' already exists in the database` });
    }

    const newRole = await Role.create({
      name:         name.trim(),
      code:         cleanCode,
      description:  (description || '').trim(),
      category:     category || 'STAFF',
      permissions:  Array.isArray(permissions) ? permissions : [],
      allowedPages: Array.isArray(allowedPages) ? allowedPages : [],
      isSystemRole: false,
      status:       'ACTIVE',
    });

    await AuditLog.create({
      action:      'ROLE_CREATED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target:      `${newRole.name} (${newRole.code})`,
      status:      'SUCCESS',
      details:     `Created new custom role '${newRole.name}' with code ${newRole.code}`,
    });

    return res.status(201).json({
      message: `Role '${newRole.name}' created successfully`,
      role: newRole,
    });
  } catch (error) {
    console.error('Create Role Error:', error);
    return res.status(500).json({ message: 'Server error creating role' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/roles/:id  — update an existing role
// ─────────────────────────────────────────────────────────────────────────────
exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, permissions, allowedPages, status } = req.body;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    if (name)                             role.name         = name.trim();
    if (description !== undefined)        role.description  = description.trim();
    if (category)                         role.category     = category;
    if (permissions)                      role.permissions  = permissions;
    if (allowedPages !== undefined)       role.allowedPages = allowedPages;
    if (status)                           role.status       = status;

    await role.save();

    await AuditLog.create({
      action:      'ROLE_UPDATED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target:      `${role.name} (${role.code})`,
      status:      'SUCCESS',
      details:     `Updated configuration for role ${role.code}`,
    });

    return res.status(200).json({
      message: `Role '${role.name}' updated successfully`,
      role,
    });
  } catch (error) {
    console.error('Update Role Error:', error);
    return res.status(500).json({ message: 'Server error updating role' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/roles/:id  — delete a custom (non-system) role
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    if (role.isSystemRole) {
      return res.status(403).json({ message: `System role '${role.name}' cannot be deleted` });
    }

    const assignedUsers = await User.countDocuments({ role: role.code });
    if (assignedUsers > 0) {
      return res.status(400).json({
        message: `Cannot delete role '${role.name}' because ${assignedUsers} active user(s) are currently assigned to it. Reassign users first.`,
      });
    }

    await Role.findByIdAndDelete(id);

    await AuditLog.create({
      action:      'ROLE_DELETED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target:      `${role.name} (${role.code})`,
      status:      'SUCCESS',
      details:     `Deleted custom role ${role.code}`,
    });

    return res.status(200).json({ message: `Role '${role.name}' deleted successfully` });
  } catch (error) {
    console.error('Delete Role Error:', error);
    return res.status(500).json({ message: 'Server error deleting role' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/roles/pages  — public list of all pages available for assignment
// (Super Admin only via route middleware)
// ─────────────────────────────────────────────────────────────────────────────
exports.getAvailablePages = async (req, res) => {
  // Static list of all ERP pages/modules that can be permission-controlled
  const pages = [
    { label: 'Dashboard',                 path: '/dashboard' },
    { label: 'Students',                  path: '/students' },
    { label: 'Staff',                     path: '/staff' },
    { label: 'Departments',               path: '/departments' },
    { label: 'Venues',                    path: '/venues' },
    { label: 'Books',                     path: '/books' },
    { label: 'Clubs',                     path: '/clubs' },
    { label: 'Sports',                    path: '/sports' },
    { label: 'Sport Teams',               path: '/sport-teams' },
    { label: 'Venue Booking',             path: '/venue-booking' },
    { label: 'Upload Materials',          path: '/upload-materials' },
    { label: 'Study Materials',           path: '/display-materials' },
    { label: 'Hostel',                    path: '/hostel' },
    { label: 'Exams',                     path: '/exams' },
    { label: 'Subjects',                  path: '/subjects' },
    { label: 'Schedule',                  path: '/schedules' },
    { label: 'Classrooms',               path: '/classrooms' },
    { label: 'Transport',                 path: '/transport' },
    { label: 'Fee Payment',               path: '/fee-payment' },
    { label: 'Event Notices',             path: '/event-notices' },
    { label: 'View Event Notices',        path: '/event-notices-board' },
    { label: 'Event Booking',             path: '/events' },
    { label: 'Alumni Profiles',           path: '/alumni' },
    { label: 'Alumni Jobs',               path: '/alumni-jobs' },
    { label: 'System Announcements',      path: '/system-announcements' },
    { label: 'View System Announcements', path: '/system-announcements-board' },
    { label: 'Attendance',                path: '/attendance' },
    { label: 'Email Communication',       path: '/email-communication' },
    { label: 'Announcements',             path: '/announcements' },
    { label: 'Academic Resources',        path: '/academic-resources' },
    { label: 'Submissions',               path: '/submissions' },
    { label: 'Role Management',           path: '/role-management' },
  ];
  return res.status(200).json(pages);
};
