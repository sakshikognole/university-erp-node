const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

// Require authentication for all student routes
router.use(verifyToken);

// POST /api/students/bulk (Bulk upload students - admin only)
router.post('/bulk', authorizeRole('SUPER_ADMIN', 'ADMIN'), studentController.bulkUploadStudents);

// GET /api/students (List all students)
router.get('/', studentController.getStudents);

// GET /api/students/:id (Get single student by ID or PRN)
router.get('/:id', studentController.getStudentById);

// POST /api/students (Create new student - admin only)
router.post('/', authorizeRole('SUPER_ADMIN', 'ADMIN'), studentController.createStudent);

// PUT /api/students/:id (Update student - admin only)
router.put('/:id', authorizeRole('SUPER_ADMIN', 'ADMIN'), studentController.updateStudent);

module.exports = router;
