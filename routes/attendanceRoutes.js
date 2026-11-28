const express    = require('express');
const router     = express.Router();
const attendanceController = require('../controllers/attendanceController');
const verifyToken   = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

router.use(verifyToken);

// GET /api/attendance/session — real student roster (admin + teacher + student)
router.get('/session',
  authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN', 'FACULTY', 'TEACHER', 'STAFF', 'STUDENT'),
  attendanceController.getSession
);

// POST /api/attendance/submit — submit attendance (admin + teacher only)
router.post('/submit',
  authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN', 'FACULTY', 'TEACHER', 'STAFF'),
  attendanceController.submitAttendance
);

// GET /api/attendance — list records; supports ?prn=<PRN> for student view
router.get('/', attendanceController.getAllAttendance);

// GET /api/attendance/:id — single record
router.get('/:id', attendanceController.getAttendanceById);

module.exports = router;
