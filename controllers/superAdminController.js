const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Role = require('../models/Role');
const Department = require('../models/Department');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const Venue = require('../models/Venue');

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

// Get Dashboard Statistics & Overview
exports.getStats = async (req, res) => {
  try {
    await ensureDefaultRoles();

    const totalUsers = await User.countDocuments();
    const superAdmins = await User.countDocuments({
      $or: [{ role: 'SUPER_ADMIN' }, { adminType: 'SUPER_ADMIN' }],
    });
    const subAdmins = await User.countDocuments({
      $or: [{ role: { $in: ['SUB_ADMIN', 'FINANCE'] } }, { adminType: 'SUB_ADMIN' }],
    });
    const teachers = await User.countDocuments({
      $or: [{ role: { $in: ['FACULTY', 'TEACHER'] } }, { adminType: 'TEACHER' }],
    });
    const students = await User.countDocuments({ role: 'STUDENT' });
    const totalRoles = await Role.countDocuments();

    // Get actual student and staff counts from dedicated models
    const totalStudents = await Student.countDocuments();
    const totalStaff = await Staff.countDocuments();
    const activeDepartments = await Department.countDocuments();

    const recentLogs = await AuditLog.find().sort({ createdAt: -1 }).limit(10);

    const departments = [
      { id: 1, name: 'Computer Science', code: 'CS', facultyCount: 24, studentCount: 450, head: 'Dr. Robert Vance' },
      { id: 2, name: 'Information Technology', code: 'IT', facultyCount: 18, studentCount: 380, head: 'Dr. Sarah Connor' },
      { id: 3, name: 'Electrical Engineering', code: 'EE', facultyCount: 20, studentCount: 310, head: 'Dr. Alan Turing' },
      { id: 4, name: 'Mechanical Engineering', code: 'ME', facultyCount: 22, studentCount: 290, head: 'Dr. Nikola Tesla' },
      { id: 5, name: 'Civil Engineering', code: 'CE', facultyCount: 15, studentCount: 220, head: 'Dr. Thomas Telford' },
      { id: 6, name: 'Finance & Accounts', code: 'FIN', facultyCount: 8, studentCount: 0, head: 'Dr. Warren Buffett' },
    ];

    const systemHealth = {
      serverStatus: 'OPERATIONAL',
      databaseStatus: 'CONNECTED',
      uptime: '99.98%',
      activeSessions: 42,
      memoryUsage: '412 MB / 2048 MB',
      environment: process.env.NODE_ENV || 'development',
    };

    return res.status(200).json({
      stats: {
        totalUsers,
        superAdmins,
        subAdmins,
        teachers,
        students,
        totalDepartments: activeDepartments,
        totalRoles,
        totalStudents,
        totalStaff,
      },
      systemHealth,
      departments,
      recentLogs,
    });
  } catch (error) {
    console.error('Super Admin Stats Error:', error);
    return res.status(500).json({ message: 'Error fetching Super Admin stats' });
  }
};

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

// Update User's Role & Department
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, department } = req.body;

    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
    }

    const userToUpdate = await User.findById(id);
    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found' });
    }

    const oldRole = userToUpdate.role;
    userToUpdate.role = role.trim().toUpperCase();

    if (department) {
      userToUpdate.department = department;
    }

    // Map adminType helper
    if (role === 'SUPER_ADMIN') userToUpdate.adminType = 'SUPER_ADMIN';
    else if (role === 'SUB_ADMIN') userToUpdate.adminType = 'SUB_ADMIN';
    else if (role === 'FACULTY' || role === 'TEACHER') userToUpdate.adminType = 'TEACHER';
    else userToUpdate.adminType = 'NONE';

    await userToUpdate.save();

    // Audit Log
    await AuditLog.create({
      action: 'USER_ROLE_CHANGED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${userToUpdate.name} (${userToUpdate.email})`,
      status: 'SUCCESS',
      details: `Changed role from ${oldRole} to ${userToUpdate.role}`,
    });

    return res.status(200).json({
      message: `Role for ${userToUpdate.name} updated to ${userToUpdate.role}`,
      user: {
        id: userToUpdate._id,
        name: userToUpdate.name,
        email: userToUpdate.email,
        role: userToUpdate.role,
        department: userToUpdate.department,
      },
    });
  } catch (error) {
    console.error('Update User Role Error:', error);
    return res.status(500).json({ message: 'Server error updating user role' });
  }
};

// Get All Users (with Search & Role Filter)
exports.getUsers = async (req, res) => {
  try {
    const { search, role, department } = req.query;
    const filter = {};

    if (role && role !== 'ALL') {
      filter.role = role;
    }

    if (department && department !== 'ALL') {
      filter.department = department;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { prn: searchRegex },
          { department: searchRegex },
          { role: searchRegex },
        ],
      });
    }

    const users = await User.find(filter)
      .select('-password -otp -otpExpires')
      .sort({ createdAt: -1 })
      .limit(150);

    return res.status(200).json(users);
  } catch (error) {
    console.error('Get Users Error:', error);
    return res.status(500).json({ message: 'Error fetching users directory' });
  }
};

// Create a New User (Sub-Admin, Teacher, Student, Super Admin, or Custom Role)
exports.createUser = async (req, res) => {
  try {
    const { name, email, role, adminType, department, prn, password } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ message: 'Name, email, and role are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanRole = role.trim().toUpperCase();

    // Check email uniqueness
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'A user with this email address already exists' });
    }

    // Check PRN uniqueness for students
    let studentPrn = prn ? prn.trim() : null;
    if (cleanRole === 'STUDENT') {
      if (!studentPrn) {
        studentPrn = `PRN${Date.now().toString().slice(-7)}`;
      } else {
        const existingPrn = await User.findOne({ prn: studentPrn });
        if (existingPrn) {
          return res.status(409).json({ message: 'A user with this PRN already exists' });
        }
      }
    }

    // Set default password if none provided
    const rawPassword =
      password ||
      (cleanRole === 'STUDENT'
        ? 'Student@123'
        : cleanRole === 'SUPER_ADMIN'
          ? 'Admin@123'
          : `${cleanRole.replace(/[^A-Za-z0-9]/g, '')}@123`);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    // Map adminType based on role
    let computedAdminType = adminType || 'NONE';
    if (cleanRole === 'SUPER_ADMIN') computedAdminType = 'SUPER_ADMIN';
    else if (cleanRole === 'SUB_ADMIN') computedAdminType = 'SUB_ADMIN';
    else if (cleanRole === 'FACULTY' || cleanRole === 'TEACHER') computedAdminType = 'TEACHER';
    else computedAdminType = 'NONE';

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      prn: studentPrn,
      password: hashedPassword,
      role: cleanRole,
      adminType: computedAdminType,
      department: department || 'General',
    });

    // Create Audit Log
    await AuditLog.create({
      action: 'USER_CREATED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${newUser.name} (${newUser.role})`,
      status: 'SUCCESS',
      details: `Created new account for ${newUser.email} with role ${newUser.role}`,
    });

    const userObj = newUser.toObject();
    delete userObj.password;
    delete userObj.otp;

    return res.status(201).json({
      message: 'User created successfully in database',
      user: userObj,
    });
  } catch (error) {
    console.error('Create User Error:', error);
    return res.status(500).json({ message: 'Server error creating user' });
  }
};

// Delete a User Account
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting own account
    if (req.user && (req.user.id === id || req.user.email === userToDelete.email)) {
      return res.status(400).json({ message: 'You cannot delete your own Super Admin account' });
    }

    await User.findByIdAndDelete(id);

    // Audit Log
    await AuditLog.create({
      action: 'USER_DELETED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${userToDelete.name} (${userToDelete.email})`,
      status: 'SUCCESS',
      details: `Deleted account ${userToDelete.email} (${userToDelete.role})`,
    });

    return res.status(200).json({
      message: `User ${userToDelete.name} has been deleted successfully from database`,
    });
  } catch (error) {
    console.error('Delete User Error:', error);
    return res.status(500).json({ message: 'Server error deleting user' });
  }
};

// Get Audit Logs (with search and limit)
exports.getAuditLogs = async (req, res) => {
  try {
    const { limit = 50, action } = req.query;
    const filter = {};

    if (action && action !== 'ALL') {
      filter.action = action;
    }

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10) || 50);

    return res.status(200).json(logs);
  } catch (error) {
    console.error('Fetch Audit Logs Error:', error);
    return res.status(500).json({ message: 'Error fetching audit logs' });
  }
};

// Get All Departments
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({ createdAt: -1 });
    return res.status(200).json(departments);
  } catch (error) {
    console.error('Get Departments Error:', error);
    return res.status(500).json({ message: 'Error fetching departments from database' });
  }
};

// Create New Department
exports.createDepartment = async (req, res) => {
  try {
    const { departmentId, name } = req.body;

    if (!departmentId || !name) {
      return res.status(400).json({ message: 'Department ID and Department Name are required' });
    }

    const cleanDeptId = departmentId.trim().toUpperCase();
    const cleanName = name.trim();

    const existingDept = await Department.findOne({ departmentId: cleanDeptId });
    if (existingDept) {
      return res.status(409).json({ 
        message: `A department with ID '${cleanDeptId}' already exists in the database` 
      });
    }

    const newDepartment = await Department.create({
      departmentId: cleanDeptId,
      name: cleanName,
    });

    await AuditLog.create({
      action: 'DEPARTMENT_CREATED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${newDepartment.name} (${newDepartment.departmentId})`,
      status: 'SUCCESS',
      details: `Created new department '${newDepartment.name}' with ID ${newDepartment.departmentId}`,
    });

    return res.status(201).json({
      message: `Department '${newDepartment.name}' created successfully in database`,
      department: newDepartment,
    });
  } catch (error) {
    console.error('Create Department Error:', error);
    return res.status(500).json({ message: 'Server error creating department' });
  }
};

// Update Existing Department
exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { departmentId, name } = req.body;

    if (!departmentId || !name) {
      return res.status(400).json({ message: 'Department ID and Department Name are required' });
    }

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const cleanDeptId = departmentId.trim().toUpperCase();
    const cleanName = name.trim();

    if (cleanDeptId !== department.departmentId) {
      const existingDept = await Department.findOne({ departmentId: cleanDeptId });
      if (existingDept) {
        return res.status(409).json({ 
          message: `A department with ID '${cleanDeptId}' already exists in the database` 
        });
      }
      department.departmentId = cleanDeptId;
    }

    department.name = cleanName;
    await department.save();

    await AuditLog.create({
      action: 'DEPARTMENT_UPDATED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${department.name} (${department.departmentId})`,
      status: 'SUCCESS',
      details: `Updated department ${department.departmentId}`,
    });

    return res.status(200).json({
      message: `Department '${department.name}' updated successfully`,
      department,
    });
  } catch (error) {
    console.error('Update Department Error:', error);
    return res.status(500).json({ message: 'Server error updating department' });
  }
};

// Delete Department
exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const assignedUsers = await User.countDocuments({ department: department.departmentId });
    if (assignedUsers > 0) {
      return res.status(400).json({
        message: `Cannot delete department '${department.name}' because ${assignedUsers} user(s) are currently assigned to it. Reassign users first.`,
      });
    }

    await Department.findByIdAndDelete(id);

    await AuditLog.create({
      action: 'DEPARTMENT_DELETED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${department.name} (${department.departmentId})`,
      status: 'SUCCESS',
      details: `Deleted department ${department.departmentId}`,
    });

    return res.status(200).json({
      message: `Department '${department.name}' deleted successfully`,
    });
  } catch (error) {
    console.error('Delete Department Error:', error);
    return res.status(500).json({ message: 'Server error deleting department' });
  }
};

// Create New Student
exports.createStudent = async (req, res) => {
  try {
    const { name, prn, class: studentClass, division, degree, yearOfEnrollment, customFields } = req.body;

    if (!name || !prn || !studentClass || !degree || !yearOfEnrollment) {
      return res.status(400).json({ message: 'Name, PRN, Class, Degree, and Year of Enrollment are required' });
    }

    const cleanPrn = prn.trim().toUpperCase();

    const existingStudent = await Student.findOne({ prn: cleanPrn });
    if (existingStudent) {
      return res.status(409).json({ 
        message: `A student with PRN '${cleanPrn}' already exists` 
      });
    }

    const newStudent = await Student.create({
      name: name.trim(),
      prn: cleanPrn,
      class: studentClass.trim(),
      division: division?.trim() || '',
      degree: degree.trim(),
      yearOfEnrollment: yearOfEnrollment.trim(),
      customFields: customFields || [],
    });

    await AuditLog.create({
      action: 'STUDENT_CREATED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${newStudent.name} (${newStudent.prn})`,
      status: 'SUCCESS',
      details: `Created new student ${newStudent.prn}`,
    });

    return res.status(201).json({
      message: `Student '${newStudent.name}' added successfully`,
      student: newStudent,
    });
  } catch (error) {
    console.error('Create Student Error:', error);
    return res.status(500).json({ message: 'Server error creating student' });
  }
};

// Get All Students
exports.getStudents = async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    return res.status(200).json(students);
  } catch (error) {
    console.error('Get Students Error:', error);
    return res.status(500).json({ message: 'Error fetching students from database' });
  }
};

// Get Single Student by ID or PRN
exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    let student = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      student = await Student.findById(id);
    }
    if (!student) {
      student = await Student.findOne({ prn: id.trim().toUpperCase() });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    return res.status(200).json(student);
  } catch (error) {
    console.error('Get Student Error:', error);
    return res.status(500).json({ message: 'Error fetching student details' });
  }
};

// Update Student
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, prn, class: studentClass, division, degree, yearOfEnrollment, customFields } = req.body;

    if (!name || !prn || !studentClass || !degree || !yearOfEnrollment) {
      return res.status(400).json({ message: 'Name, PRN, Class, Degree, and Year of Enrollment are required' });
    }

    let student = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      student = await Student.findById(id);
    }
    if (!student) {
      student = await Student.findOne({ prn: id.trim().toUpperCase() });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const cleanPrn = prn.trim().toUpperCase();

    // If PRN changed, check uniqueness
    if (cleanPrn !== student.prn) {
      const existingStudent = await Student.findOne({ prn: cleanPrn });
      if (existingStudent && existingStudent._id.toString() !== student._id.toString()) {
        return res.status(409).json({
          message: `A student with PRN '${cleanPrn}' already exists`,
        });
      }
      student.prn = cleanPrn;
    }

    student.name = name.trim();
    student.class = studentClass.trim();
    student.division = division !== undefined ? division.trim() : student.division;
    student.degree = degree.trim();
    student.yearOfEnrollment = yearOfEnrollment.trim();
    if (Array.isArray(customFields)) {
      student.customFields = customFields;
    }

    await student.save();

    await AuditLog.create({
      action: 'STUDENT_UPDATED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${student.name} (${student.prn})`,
      status: 'SUCCESS',
      details: `Updated student record for ${student.prn}`,
    });

    return res.status(200).json({
      message: `Student '${student.name}' updated successfully`,
      student,
    });
  } catch (error) {
    console.error('Update Student Error:', error);
    return res.status(500).json({ message: 'Server error updating student' });
  }
};

// Get All Staff Members
exports.getStaff = async (req, res) => {
  try {
    const staffList = await Staff.find().sort({ createdAt: -1 });
    return res.status(200).json(staffList);
  } catch (error) {
    console.error('Get Staff Error:', error);
    return res.status(500).json({ message: 'Error fetching staff members from database' });
  }
};

// Get Single Staff Member by ID or staffId
exports.getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    let staffMember = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      staffMember = await Staff.findById(id);
    }
    if (!staffMember) {
      staffMember = await Staff.findOne({ staffId: id.trim().toUpperCase() });
    }

    if (!staffMember) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    return res.status(200).json(staffMember);
  } catch (error) {
    console.error('Get Staff Error:', error);
    return res.status(500).json({ message: 'Error fetching staff member details' });
  }
};

// Create New Staff
exports.createStaff = async (req, res) => {
  try {
    const { name, staffId, email, phone, dateOfJoining, role, bankDetails } = req.body;

    if (!name || !staffId || !email || !phone || !dateOfJoining || !role) {
      return res.status(400).json({ message: 'Name, Staff ID, Email, Phone, Date of Joining, and Role are required' });
    }

    const cleanStaffId = staffId.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    const existingStaff = await Staff.findOne({ staffId: cleanStaffId });
    if (existingStaff) {
      return res.status(409).json({ 
        message: `A staff member with ID '${cleanStaffId}' already exists` 
      });
    }

    const existingEmail = await Staff.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(409).json({ 
        message: `A staff member with email '${cleanEmail}' already exists` 
      });
    }

    const newStaff = await Staff.create({
      name: name.trim(),
      staffId: cleanStaffId,
      email: cleanEmail,
      phone: phone.trim(),
      dateOfJoining: new Date(dateOfJoining),
      role: role.trim(),
      bankDetails: {
        bankName: bankDetails?.bankName?.trim() || '',
        accountHolderName: bankDetails?.accountHolderName?.trim() || '',
        accountNumber: bankDetails?.accountNumber?.trim() || '',
        ifscCode: bankDetails?.ifscCode?.trim().toUpperCase() || '',
      },
    });

    await AuditLog.create({
      action: 'STAFF_CREATED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${newStaff.name} (${newStaff.staffId})`,
      status: 'SUCCESS',
      details: `Created new staff member ${newStaff.staffId}`,
    });

    return res.status(201).json({
      message: `Staff member '${newStaff.name}' added successfully`,
      staff: newStaff,
    });
  } catch (error) {
    console.error('Create Staff Error:', error);
    return res.status(500).json({ message: 'Server error creating staff' });
  }
};

// Update Staff Member
exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, staffId, email, phone, dateOfJoining, role, bankDetails } = req.body;

    if (!name || !staffId || !email || !phone || !dateOfJoining || !role) {
      return res.status(400).json({ message: 'Name, Staff ID, Email, Phone, Date of Joining, and Role are required' });
    }

    let staffMember = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      staffMember = await Staff.findById(id);
    }
    if (!staffMember) {
      staffMember = await Staff.findOne({ staffId: id.trim().toUpperCase() });
    }

    if (!staffMember) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    const cleanStaffId = staffId.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check staffId uniqueness if changed
    if (cleanStaffId !== staffMember.staffId) {
      const existingStaff = await Staff.findOne({ staffId: cleanStaffId });
      if (existingStaff && existingStaff._id.toString() !== staffMember._id.toString()) {
        return res.status(409).json({
          message: `A staff member with ID '${cleanStaffId}' already exists`,
        });
      }
      staffMember.staffId = cleanStaffId;
    }

    // Check email uniqueness if changed
    if (cleanEmail !== staffMember.email) {
      const existingEmail = await Staff.findOne({ email: cleanEmail });
      if (existingEmail && existingEmail._id.toString() !== staffMember._id.toString()) {
        return res.status(409).json({
          message: `A staff member with email '${cleanEmail}' already exists`,
        });
      }
      staffMember.email = cleanEmail;
    }

    staffMember.name = name.trim();
    staffMember.phone = phone.trim();
    staffMember.dateOfJoining = new Date(dateOfJoining);
    staffMember.role = role.trim();
    if (bankDetails) {
      staffMember.bankDetails = {
        bankName: bankDetails?.bankName?.trim() || '',
        accountHolderName: bankDetails?.accountHolderName?.trim() || '',
        accountNumber: bankDetails?.accountNumber?.trim() || '',
        ifscCode: bankDetails?.ifscCode?.trim().toUpperCase() || '',
      };
    }

    await staffMember.save();

    await AuditLog.create({
      action: 'STAFF_UPDATED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${staffMember.name} (${staffMember.staffId})`,
      status: 'SUCCESS',
      details: `Updated staff record for ${staffMember.staffId}`,
    });

    return res.status(200).json({
      message: `Staff member '${staffMember.name}' updated successfully`,
      staff: staffMember,
    });
  } catch (error) {
    console.error('Update Staff Error:', error);
    return res.status(500).json({ message: 'Server error updating staff' });
  }
};

// Bulk Upload Students
exports.bulkUploadStudents = async (req, res) => {
  try {
    const { students } = req.body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'Students array is required and must not be empty' });
    }

    const results = {
      created: 0,
      failed: 0,
      details: [],
    };

    for (const studentData of students) {
      try {
        const { name, prn, class: studentClass, division, degree, yearOfEnrollment, customFields } = studentData;

        if (!name || !prn || !studentClass || !degree || !yearOfEnrollment) {
          results.failed++;
          results.details.push({
            prn: prn || 'Unknown',
            status: 'FAILED',
            reason: 'Missing required fields',
          });
          continue;
        }

        const cleanPrn = prn.trim().toUpperCase();

        const existingStudent = await Student.findOne({ prn: cleanPrn });
        if (existingStudent) {
          results.failed++;
          results.details.push({
            prn: cleanPrn,
            status: 'FAILED',
            reason: 'PRN already exists',
          });
          continue;
        }

        await Student.create({
          name: name.trim(),
          prn: cleanPrn,
          class: studentClass.trim(),
          division: division?.trim() || '',
          degree: degree.trim(),
          yearOfEnrollment: yearOfEnrollment.trim(),
          customFields: customFields || [],
        });

        results.created++;
        results.details.push({
          prn: cleanPrn,
          status: 'SUCCESS',
          reason: 'Student created successfully',
        });
      } catch (err) {
        results.failed++;
        results.details.push({
          prn: studentData.prn || 'Unknown',
          status: 'FAILED',
          reason: err.message,
        });
      }
    }

    await AuditLog.create({
      action: 'BULK_STUDENT_UPLOAD',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${results.created} students`,
      status: results.created > 0 ? 'SUCCESS' : 'FAILED',
      details: `Bulk upload: ${results.created} created, ${results.failed} failed`,
    });

    return res.status(results.created > 0 ? 201 : 400).json({
      message: `Bulk upload completed: ${results.created} students created, ${results.failed} failed`,
      created: results.created,
      failed: results.failed,
      details: results.details,
    });
  } catch (error) {
    console.error('Bulk Upload Students Error:', error);
    return res.status(500).json({ message: 'Server error during bulk upload' });
  }
};

// Get All Venues
exports.getVenues = async (req, res) => {
  try {
    const venues = await Venue.find().sort({ createdAt: -1 });
    return res.status(200).json(venues);
  } catch (error) {
    console.error('Get Venues Error:', error);
    return res.status(500).json({ message: 'Error fetching venues from database' });
  }
};

// Get Single Venue by ID or venueId
exports.getVenueById = async (req, res) => {
  try {
    const { id } = req.params;
    let venue = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      venue = await Venue.findById(id);
    }
    if (!venue) {
      venue = await Venue.findOne({ venueId: id.trim().toUpperCase() });
    }

    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    return res.status(200).json(venue);
  } catch (error) {
    console.error('Get Venue Error:', error);
    return res.status(500).json({ message: 'Error fetching venue details' });
  }
};

// Create New Venue
exports.createVenue = async (req, res) => {
  try {
    const { venueId, name, capacity, facilities, status } = req.body;

    if (!venueId || !name || !capacity || !status) {
      return res.status(400).json({ message: 'Venue ID, Name, Capacity, and Status are required' });
    }

    if (capacity < 1) {
      return res.status(400).json({ message: 'Capacity must be at least 1' });
    }

    const cleanVenueId = venueId.trim().toUpperCase();

    const existingVenue = await Venue.findOne({ venueId: cleanVenueId });
    if (existingVenue) {
      return res.status(409).json({ 
        message: `A venue with ID '${cleanVenueId}' already exists` 
      });
    }

    const newVenue = await Venue.create({
      venueId: cleanVenueId,
      name: name.trim(),
      capacity: Number(capacity),
      facilities: Array.isArray(facilities)
        ? facilities.map(f => ({
            name: f.name?.trim() || '',
            details: f.details?.trim() || '',
          })).filter(f => f.name)
        : [],
      status: status.trim().toUpperCase(),
    });

    await AuditLog.create({
      action: 'VENUE_CREATED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${newVenue.name} (${newVenue.venueId})`,
      status: 'SUCCESS',
      details: `Created new venue ${newVenue.venueId}`,
    });

    return res.status(201).json({
      message: `Venue '${newVenue.name}' added successfully`,
      venue: newVenue,
    });
  } catch (error) {
    console.error('Create Venue Error:', error);
    return res.status(500).json({ message: 'Server error creating venue' });
  }
};

// Update Venue
exports.updateVenue = async (req, res) => {
  try {
    const { id } = req.params;
    const { venueId, name, capacity, facilities, status } = req.body;

    if (!venueId || !name || !capacity || !status) {
      return res.status(400).json({ message: 'Venue ID, Name, Capacity, and Status are required' });
    }

    if (capacity < 1) {
      return res.status(400).json({ message: 'Capacity must be at least 1' });
    }

    let venue = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      venue = await Venue.findById(id);
    }
    if (!venue) {
      venue = await Venue.findOne({ venueId: id.trim().toUpperCase() });
    }

    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const cleanVenueId = venueId.trim().toUpperCase();

    // If venueId changed, check uniqueness
    if (cleanVenueId !== venue.venueId) {
      const existingVenue = await Venue.findOne({ venueId: cleanVenueId });
      if (existingVenue && existingVenue._id.toString() !== venue._id.toString()) {
        return res.status(409).json({
          message: `A venue with ID '${cleanVenueId}' already exists`,
        });
      }
      venue.venueId = cleanVenueId;
    }

    venue.name = name.trim();
    venue.capacity = Number(capacity);
    venue.facilities = Array.isArray(facilities)
      ? facilities.map(f => ({
          name: f.name?.trim() || '',
          details: f.details?.trim() || '',
        })).filter(f => f.name)
      : [];
    venue.status = status.trim().toUpperCase();

    await venue.save();

    await AuditLog.create({
      action: 'VENUE_UPDATED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${venue.name} (${venue.venueId})`,
      status: 'SUCCESS',
      details: `Updated venue record for ${venue.venueId}`,
    });

    return res.status(200).json({
      message: `Venue '${venue.name}' updated successfully`,
      venue,
    });
  } catch (error) {
    console.error('Update Venue Error:', error);
    return res.status(500).json({ message: 'Server error updating venue' });
  }
};

// Delete Venue
exports.deleteVenue = async (req, res) => {
  try {
    const { id } = req.params;
    let venue = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      venue = await Venue.findById(id);
    }
    if (!venue) {
      venue = await Venue.findOne({ venueId: id.trim().toUpperCase() });
    }

    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    await Venue.findByIdAndDelete(venue._id);

    await AuditLog.create({
      action: 'VENUE_DELETED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${venue.name} (${venue.venueId})`,
      status: 'SUCCESS',
      details: `Deleted venue ${venue.venueId}`,
    });

    return res.status(200).json({
      message: `Venue '${venue.name}' deleted successfully`,
    });
  } catch (error) {
    console.error('Delete Venue Error:', error);
    return res.status(500).json({ message: 'Server error deleting venue' });
  }
};

// Bulk Upload Venues
exports.bulkUploadVenues = async (req, res) => {
  try {
    const { venues } = req.body;

    if (!Array.isArray(venues) || venues.length === 0) {
      return res.status(400).json({ message: 'Venues array is required and cannot be empty' });
    }

    const results = {
      created: 0,
      failed: 0,
      details: [],
    };

    for (const venueData of venues) {
      try {
        const { venueId, name, capacity, facilities, status } = venueData;

        if (!venueId || !name || !capacity || !status) {
          results.failed++;
          results.details.push({
            venueId: venueId || 'Unknown',
            status: 'failed',
            reason: 'Missing required fields',
          });
          continue;
        }

        if (capacity < 1) {
          results.failed++;
          results.details.push({
            venueId,
            status: 'failed',
            reason: 'Capacity must be at least 1',
          });
          continue;
        }

        const cleanVenueId = venueId.trim().toUpperCase();

        const existingVenue = await Venue.findOne({ venueId: cleanVenueId });
        if (existingVenue) {
          results.failed++;
          results.details.push({
            venueId: cleanVenueId,
            status: 'failed',
            reason: 'Venue ID already exists',
          });
          continue;
        }

        await Venue.create({
          venueId: cleanVenueId,
          name: name.trim(),
          capacity: Number(capacity),
          facilities: Array.isArray(facilities)
            ? facilities.map(f => ({
                name: f.name?.trim() || '',
                details: f.details?.trim() || '',
              })).filter(f => f.name)
            : [],
          status: status.trim().toUpperCase(),
        });

        results.created++;
        results.details.push({
          venueId: cleanVenueId,
          status: 'success',
        });

        await AuditLog.create({
          action: 'VENUE_BULK_CREATED',
          performedBy: req.user?.email || 'superadmin@university.edu',
          target: `${name.trim()} (${cleanVenueId})`,
          status: 'SUCCESS',
          details: `Bulk created venue ${cleanVenueId}`,
        });
      } catch (error) {
        results.failed++;
        results.details.push({
          venueId: venueData.venueId || 'Unknown',
          status: 'failed',
          reason: error.message,
        });
      }
    }

    return res.status(201).json({
      message: `Bulk upload completed: ${results.created} created, ${results.failed} failed`,
      created: results.created,
      failed: results.failed,
      details: results.details,
    });
  } catch (error) {
    console.error('Bulk Upload Venues Error:', error);
    return res.status(500).json({ message: 'Server error during bulk venue creation' });
  }
};

// Bulk Upload Students
exports.bulkUploadStudents = async (req, res) => {
  try {
    const { students } = req.body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'Students array is required and must not be empty' });
    }

    const results = {
      created: 0,
      failed: 0,
      details: [],
    };

    for (const studentData of students) {
      try {
        const { name, prn, class: studentClass, division, degree, yearOfEnrollment, customFields } = studentData;

        if (!name || !prn || !studentClass || !degree || !yearOfEnrollment) {
          results.failed++;
          results.details.push({
            prn: prn || 'Unknown',
            status: 'FAILED',
            reason: 'Missing required fields',
          });
          continue;
        }

        const cleanPrn = prn.trim().toUpperCase();

        const existingStudent = await Student.findOne({ prn: cleanPrn });
        if (existingStudent) {
          results.failed++;
          results.details.push({
            prn: cleanPrn,
            status: 'FAILED',
            reason: 'PRN already exists',
          });
          continue;
        }

        await Student.create({
          name: name.trim(),
          prn: cleanPrn,
          class: studentClass.trim(),
          division: division?.trim() || '',
          degree: degree.trim(),
          yearOfEnrollment: yearOfEnrollment.trim(),
          customFields: customFields || [],
        });

        results.created++;
        results.details.push({
          prn: cleanPrn,
          status: 'SUCCESS',
          reason: 'Student created successfully',
        });
      } catch (err) {
        results.failed++;
        results.details.push({
          prn: studentData.prn || 'Unknown',
          status: 'FAILED',
          reason: err.message,
        });
      }
    }

    await AuditLog.create({
      action: 'BULK_STUDENT_UPLOAD',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${results.created} students`,
      status: results.created > 0 ? 'SUCCESS' : 'FAILED',
      details: `Bulk upload: ${results.created} created, ${results.failed} failed`,
    });

    return res.status(results.created > 0 ? 201 : 400).json({
      message: `Bulk upload completed: ${results.created} students created, ${results.failed} failed`,
      created: results.created,
      failed: results.failed,
      details: results.details,
    });
  } catch (error) {
    console.error('Bulk Upload Students Error:', error);
    return res.status(500).json({ message: 'Server error during bulk upload' });
  }
};
