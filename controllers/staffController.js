const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const Staff    = require('../models/Staff');
const User     = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { validateStaffFields } = require('../utils/staffValidation');

const TEACHER_ROLES = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Head of Department', 'Dean', 'Teacher'];

// Default password for all teacher accounts: "Teacher@123"
const TEACHER_DEFAULT_PASSWORD = 'Teacher@123';

/**
 * Sync a staff member to the User collection so they can log in.
 * Only syncs Teacher/Faculty roles.
 */
const syncTeacherUser = async (staff) => {
  try {
    const isTeacher = TEACHER_ROLES.some(
      (r) => r.toLowerCase() === (staff.role || '').toLowerCase()
    );
    if (!isTeacher) return;

    const existing = await User.findOne({ email: staff.email });
    if (existing) {
      // Update department if changed
      if (existing.department !== staff.department) {
        existing.department = staff.department || 'General';
        await existing.save();
      }
      return existing;
    }

    const hashed = await bcrypt.hash(TEACHER_DEFAULT_PASSWORD, 10);
    const newUser = await User.create({
      name:      staff.name,
      email:     staff.email,
      password:  hashed,
      role:      'TEACHER',
      adminType: 'TEACHER',
      department: staff.department || 'General',
    });
    return newUser;
  } catch (err) {
    console.error('syncTeacherUser error:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get All Staff Members
// ─────────────────────────────────────────────────────────────────────────────
exports.getStaff = async (req, res) => {
  try {
    const staffList = await Staff.find().sort({ createdAt: -1 });
    return res.status(200).json(staffList);
  } catch (error) {
    console.error('Get Staff Error:', error);
    return res.status(500).json({ message: 'Error fetching staff members from database' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get Single Staff Member
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Create New Staff
// ─────────────────────────────────────────────────────────────────────────────
exports.createStaff = async (req, res) => {
  try {
    const { name, staffId, email, phone, dateOfJoining, role, department, bankDetails } = req.body;

    if (!name || !staffId || !email || !phone || !dateOfJoining || !role) {
      return res.status(400).json({ message: 'Name, Staff ID, Email, Phone, Date of Joining, and Role are required' });
    }

    const { errors, isValid } = validateStaffFields({ name, staffId, email, phone, role });
    if (!isValid) {
      const firstError = Object.values(errors)[0];
      return res.status(400).json({ message: firstError, validationErrors: errors });
    }

    const cleanStaffId = staffId.trim().toUpperCase();
    const cleanEmail   = email.trim().toLowerCase();
    const cleanPhone   = phone.trim().replace(/\s/g, '');

    const existingStaff = await Staff.findOne({ staffId: cleanStaffId });
    if (existingStaff) {
      return res.status(409).json({ message: `A staff member with ID '${cleanStaffId}' already exists` });
    }

    const existingEmail = await Staff.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(409).json({ message: `A staff member with email '${cleanEmail}' already exists` });
    }

    const existingPhone = await Staff.findOne({ phone: cleanPhone });
    if (existingPhone) {
      return res.status(409).json({ message: `A staff member with phone number '${cleanPhone}' already exists` });
    }

    const newStaff = await Staff.create({
      name:          name.trim(),
      staffId:       cleanStaffId,
      email:         cleanEmail,
      phone:         cleanPhone,
      dateOfJoining: new Date(dateOfJoining),
      role:          role.trim(),
      department:    (department || '').trim(),
      bankDetails: {
        bankName:          bankDetails?.bankName?.trim()          || '',
        accountHolderName: bankDetails?.accountHolderName?.trim() || '',
        accountNumber:     bankDetails?.accountNumber?.trim()      || '',
        ifscCode:          bankDetails?.ifscCode?.trim().toUpperCase() || '',
      },
    });

    // Sync teacher to User collection for login
    await syncTeacherUser(newStaff);

    await AuditLog.create({
      action:      'STAFF_CREATED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target:      `${newStaff.name} (${newStaff.staffId})`,
      status:      'SUCCESS',
      details:     `Created new staff member ${newStaff.staffId}`,
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

// ─────────────────────────────────────────────────────────────────────────────
// Update Staff Member
// ─────────────────────────────────────────────────────────────────────────────
exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, staffId, email, phone, dateOfJoining, role, department, bankDetails } = req.body;

    if (!name || !staffId || !email || !phone || !dateOfJoining || !role) {
      return res.status(400).json({ message: 'Name, Staff ID, Email, Phone, Date of Joining, and Role are required' });
    }

    const { errors, isValid } = validateStaffFields({ name, staffId, email, phone, role });
    if (!isValid) {
      const firstError = Object.values(errors)[0];
      return res.status(400).json({ message: firstError, validationErrors: errors });
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
    const cleanEmail   = email.trim().toLowerCase();
    const cleanPhone   = phone.trim().replace(/\s/g, '');

    if (cleanStaffId !== staffMember.staffId) {
      const existingStaff = await Staff.findOne({ staffId: cleanStaffId });
      if (existingStaff && existingStaff._id.toString() !== staffMember._id.toString()) {
        return res.status(409).json({ message: `A staff member with ID '${cleanStaffId}' already exists` });
      }
      staffMember.staffId = cleanStaffId;
    }

    if (cleanEmail !== staffMember.email) {
      const existingEmail = await Staff.findOne({ email: cleanEmail });
      if (existingEmail && existingEmail._id.toString() !== staffMember._id.toString()) {
        return res.status(409).json({ message: `A staff member with email '${cleanEmail}' already exists` });
      }
      staffMember.email = cleanEmail;
    }

    if (cleanPhone !== staffMember.phone) {
      const existingPhone = await Staff.findOne({ phone: cleanPhone });
      if (existingPhone && existingPhone._id.toString() !== staffMember._id.toString()) {
        return res.status(409).json({ message: `A staff member with phone number '${cleanPhone}' already exists` });
      }
      staffMember.phone = cleanPhone;
    }

    staffMember.name          = name.trim();
    staffMember.dateOfJoining = new Date(dateOfJoining);
    staffMember.role          = role.trim();
    staffMember.department    = (department || '').trim();

    if (bankDetails) {
      staffMember.bankDetails = {
        bankName:          bankDetails?.bankName?.trim()          || '',
        accountHolderName: bankDetails?.accountHolderName?.trim() || '',
        accountNumber:     bankDetails?.accountNumber?.trim()      || '',
        ifscCode:          bankDetails?.ifscCode?.trim().toUpperCase() || '',
      };
    }

    await staffMember.save();

    // Keep User record in sync (department may have changed)
    await syncTeacherUser(staffMember);

    await AuditLog.create({
      action:      'STAFF_UPDATED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target:      `${staffMember.name} (${staffMember.staffId})`,
      status:      'SUCCESS',
      details:     `Updated staff record for ${staffMember.staffId}`,
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
