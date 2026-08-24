const Role = require('../models/Role');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Initial default system roles seed
const defaultSystemRoles = [
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

// Helper to ensure initial system roles exist in MongoDB
const ensureDefaultRoles = async () => {
  const count = await Role.countDocuments();
  if (count === 0) {
    await Role.insertMany(defaultSystemRoles);
  }
};

exports.ensureDefaultRoles = ensureDefaultRoles;
exports.defaultSystemRoles = defaultSystemRoles;

// Get All Roles with live user counts
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

// Create a New Custom Role
exports.createRole = async (req, res) => {
  try {
    const { name, code, description, category, permissions } = req.body;

    if (!name || !code) {
      return res.status(400).json({ message: 'Role name and role code are required' });
    }

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '_');

    // Check if role code already exists in database
    const existingRole = await Role.findOne({ code: cleanCode });
    if (existingRole) {
      return res.status(409).json({ message: `A role with code '${cleanCode}' already exists in the database` });
    }

    const newRole = await Role.create({
      name: name.trim(),
      code: cleanCode,
      description: (description || '').trim(),
      category: category || 'STAFF',
      permissions: Array.isArray(permissions) ? permissions : [],
      isSystemRole: false,
      status: 'ACTIVE',
    });

    // Audit Log
    await AuditLog.create({
      action: 'ROLE_CREATED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${newRole.name} (${newRole.code})`,
      status: 'SUCCESS',
      details: `Created new custom role '${newRole.name}' with code ${newRole.code}`,
    });

    return res.status(201).json({
      message: `Role '${newRole.name}' created successfully in database`,
      role: newRole,
    });
  } catch (error) {
    console.error('Create Role Error:', error);
    return res.status(500).json({ message: 'Server error creating role' });
  }
};

// Update an Existing Role
exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, permissions, status } = req.body;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    if (name) role.name = name.trim();
    if (description !== undefined) role.description = description.trim();
    if (category) role.category = category;
    if (permissions) role.permissions = permissions;
    if (status) role.status = status;

    await role.save();

    // Audit Log
    await AuditLog.create({
      action: 'ROLE_UPDATED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${role.name} (${role.code})`,
      status: 'SUCCESS',
      details: `Updated configuration for role ${role.code}`,
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

// Delete a Custom Role
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

    // Check if any user is currently assigned this role
    const assignedUsers = await User.countDocuments({ role: role.code });
    if (assignedUsers > 0) {
      return res.status(400).json({
        message: `Cannot delete role '${role.name}' because ${assignedUsers} active user(s) are currently assigned to it. Reassign users first.`,
      });
    }

    await Role.findByIdAndDelete(id);

    // Audit Log
    await AuditLog.create({
      action: 'ROLE_DELETED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${role.name} (${role.code})`,
      status: 'SUCCESS',
      details: `Deleted custom role ${role.code}`,
    });

    return res.status(200).json({
      message: `Role '${role.name}' deleted successfully`,
    });
  } catch (error) {
    console.error('Delete Role Error:', error);
    return res.status(500).json({ message: 'Server error deleting role' });
  }
};
