const express = require('express');

const router = express.Router();

const upload = require('../middleware/upload');

const {
  submitAssignment,
  getSubmissions,
  getStudentSubmission,
  updateMarks
} = require('../controllers/submissionController');

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

// Faculty updates marks
router.put(
  '/:submissionId/marks',
  updateMarks
);

module.exports = router;