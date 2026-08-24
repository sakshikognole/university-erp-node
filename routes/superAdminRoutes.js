const express = require('express');
const router = express.Router();

const superAdminController = require('../controllers/superAdminController');

const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

// All Super Admin routes require a valid token and SUPER_ADMIN role
router.use(verifyToken, authorizeRole('SUPER_ADMIN'));

// GET /api/super-admin/stats
router.get('/stats', superAdminController.getStats);

// GET /api/super-admin/users (List users with search & filters)
router.get('/users', superAdminController.getUsers);

// POST /api/super-admin/users (Create new user)
router.post('/users', superAdminController.createUser);

// DELETE /api/super-admin/users/:id (Delete user)
router.delete('/users/:id', superAdminController.deleteUser);

// GET /api/super-admin/roles (List all roles with counts)
router.get('/roles', superAdminController.getRoles);

// POST /api/super-admin/roles (Create new custom role)
router.post('/roles', superAdminController.createRole);

// PUT /api/super-admin/roles/:id (Update role details & permissions)
router.put('/roles/:id', superAdminController.updateRole);

// DELETE /api/super-admin/roles/:id (Delete custom role)
router.delete('/roles/:id', superAdminController.deleteRole);

// PUT /api/super-admin/users/:id/role (Update a user's assigned role)
router.put('/users/:id/role', superAdminController.updateUserRole);

// GET /api/super-admin/departments (List departments)
router.get('/departments', superAdminController.getDepartments);

// POST /api/super-admin/departments (Create new department)
router.post('/departments', superAdminController.createDepartment);

// PUT /api/super-admin/departments/:id (Update department)
router.put('/departments/:id', superAdminController.updateDepartment);

// DELETE /api/super-admin/departments/:id (Delete department)
router.delete('/departments/:id', superAdminController.deleteDepartment);

// GET /api/super-admin/audit-logs
router.get('/audit-logs', superAdminController.getAuditLogs);

// POST /api/super-admin/students/bulk (Bulk upload students) - MUST be before /students POST
router.post('/students/bulk', superAdminController.bulkUploadStudents);

// GET /api/super-admin/students (List all students)
router.get('/students', superAdminController.getStudents);

// GET /api/super-admin/students/:id (Get single student)
router.get('/students/:id', superAdminController.getStudentById);

// POST /api/super-admin/students (Create new student)
router.post('/students', superAdminController.createStudent);

// PUT /api/super-admin/students/:id (Update student)
router.put('/students/:id', superAdminController.updateStudent);

// GET /api/super-admin/staff (List all staff)
router.get('/staff', superAdminController.getStaff);

// GET /api/super-admin/staff/:id (Get single staff member)
router.get('/staff/:id', superAdminController.getStaffById);

// POST /api/super-admin/staff (Create new staff)
router.post('/staff', superAdminController.createStaff);

// PUT /api/super-admin/staff/:id (Update staff member)
router.put('/staff/:id', superAdminController.updateStaff);

// GET /api/super-admin/venues (List all venues)
router.get('/venues', superAdminController.getVenues);

// POST /api/super-admin/venues/bulk (Bulk upload venues) - MUST be before /venues POST
router.post('/venues/bulk', superAdminController.bulkUploadVenues);

// GET /api/super-admin/venues/:id (Get single venue)
router.get('/venues/:id', superAdminController.getVenueById);

// POST /api/super-admin/venues (Create new venue)
router.post('/venues', superAdminController.createVenue);

// PUT /api/super-admin/venues/:id (Update venue)
router.put('/venues/:id', superAdminController.updateVenue);

// DELETE /api/super-admin/venues/:id (Delete venue)
router.delete('/venues/:id', superAdminController.deleteVenue);

module.exports = router;