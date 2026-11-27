const express = require('express');

const router = express.Router();

const upload = require('../middleware/upload');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

const {
  submitAssignment,
  getSubmissions,
  getStudentSubmission,
  updateMarks
} = require('../controllers/submissionController');

// All submission routes require authentication
router.use(verifyToken);

// Student submits assignment
router.post(
  '/:announcementId/submit',
  upload.single('file'),
  submitAssignment
);

// Student gets their own submission
router.get(
  '/:announcementId/student/:student',
  getStudentSubmission
);

// Faculty gets all submissions for an announcement
router.get(
  '/:announcementId',
  getSubmissions
);

// Faculty / Teacher / Staff / Admin updates marks
router.put(
  '/:submissionId/marks',
  authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN', 'FACULTY', 'TEACHER', 'STAFF'),
  updateMarks
);

module.exports = router;