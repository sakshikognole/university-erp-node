const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

// POST /api/students/bulk (Bulk upload students) - Note: Placed before /:id route
router.post('/bulk', studentController.bulkUploadStudents);

// GET /api/students (List all students)
router.get('/', studentController.getStudents);

// GET /api/students/:id (Get single student by ID or PRN)
router.get('/:id', studentController.getStudentById);

// POST /api/students (Create new student)
router.post('/', studentController.createStudent);

// PUT /api/students/:id (Update student by ID or PRN)
router.put('/:id', studentController.updateStudent);

module.exports = router;
