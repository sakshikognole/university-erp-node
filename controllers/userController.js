const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

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
