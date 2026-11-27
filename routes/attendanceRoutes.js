const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

// All attendance routes require a valid token
router.use(verifyToken);

// GET  /api/attendance/session  — returns dummy session meta + full student roster
router.get('/session', attendanceController.getSession);

// POST /api/attendance/submit   — submit a completed attendance sheet (Admin / Sub-admin / Faculty / Teacher / Staff)
router.post('/submit', authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN', 'FACULTY', 'TEACHER', 'STAFF'), attendanceController.submitAttendance);

// GET  /api/attendance           — list all saved attendance records
router.get('/', attendanceController.getAllAttendance);

// GET  /api/attendance/:id       — get one attendance record by id
router.get('/:id', attendanceController.getAttendanceById);

module.exports = router;
