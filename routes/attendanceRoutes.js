const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

// GET  /api/attendance/session  — returns dummy session meta + full student roster
router.get('/session', attendanceController.getSession);

// POST /api/attendance/submit   — submit a completed attendance sheet
router.post('/submit', attendanceController.submitAttendance);

// GET  /api/attendance           — list all saved attendance records
router.get('/', attendanceController.getAllAttendance);

// GET  /api/attendance/:id       — get one attendance record by id
router.get('/:id', attendanceController.getAttendanceById);

module.exports = router;
