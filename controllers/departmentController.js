const Department = require('../models/Department');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

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
