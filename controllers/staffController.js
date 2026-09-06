const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const AuditLog = require('../models/AuditLog');

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
