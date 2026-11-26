const express = require('express');

const {
  createAnnouncement,
  getAllAnnouncements,
  getAnnouncementById,
  getAnnouncementsBySubject,
  submitWork,
  getSubmissions,
  deleteAnnouncement,
  updateAnnouncementDeadline
} = require('../controllers/announcementController');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

const router = express.Router();

router.get('/test', (req, res) => {
  res.json({
    message: 'Announcement route is working'
  });
});

// All announcement endpoints require a valid token
router.use(verifyToken);

// Get all announcements
router.get('/', getAllAnnouncements);

// Create announcement (Admin / Faculty / Staff)
router.post('/', authorizeRole('SUPER_ADMIN', 'ADMIN', 'FACULTY', 'STAFF'), createAnnouncement);
router.get('/single/:announcementId', getAnnouncementById);
// Get announcements by subject
router.get('/subject/:subjectId', getAnnouncementsBySubject);

// Submit work
//router.post('/:announcementId/submit', submitWork);
router.put('/:id/deadline', authorizeRole('SUPER_ADMIN', 'ADMIN', 'FACULTY', 'STAFF'), updateAnnouncementDeadline);
// Get submissions
router.get('/:announcementId/submissions', getSubmissions);

// Delete announcement (Admin / Faculty / Staff)
router.delete('/:id', authorizeRole('SUPER_ADMIN', 'ADMIN', 'FACULTY', 'STAFF'), deleteAnnouncement);

module.exports = router;
