const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

// Require authentication for all department routes
router.use(verifyToken);

// GET /api/departments (List all departments)
router.get('/', departmentController.getDepartments);

// POST /api/departments (Create new department - admin only)
router.post('/', authorizeRole('SUPER_ADMIN', 'ADMIN'), departmentController.createDepartment);

// PUT /api/departments/:id (Update department - admin only)
router.put('/:id', authorizeRole('SUPER_ADMIN', 'ADMIN'), departmentController.updateDepartment);

// DELETE /api/departments/:id (Delete department - admin only)
router.delete('/:id', authorizeRole('SUPER_ADMIN', 'ADMIN'), departmentController.deleteDepartment);

module.exports = router;
