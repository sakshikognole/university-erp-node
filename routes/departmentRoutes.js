const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');

// GET /api/departments (List all departments)
router.get('/', departmentController.getDepartments);

// POST /api/departments (Create new department)
router.post('/', departmentController.createDepartment);

// PUT /api/departments/:id (Update department)
router.put('/:id', departmentController.updateDepartment);

// DELETE /api/departments/:id (Delete department)
router.delete('/:id', departmentController.deleteDepartment);

module.exports = router;
