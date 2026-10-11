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

const router = express.Router();

router.get('/test', (req, res) => {
  res.json({
    message: 'Announcement route is working'
  });
});

// Get all announcements
router.get('/', getAllAnnouncements);

// Create announcement
router.post('/', createAnnouncement);
router.get('/single/:announcementId', getAnnouncementById);
// Get announcements by subject
router.get('/subject/:subjectId', getAnnouncementsBySubject);

// Submit work
//router.post('/:announcementId/submit', submitWork);
router.put('/:id/deadline', updateAnnouncementDeadline);
// Get submissions
router.get('/:announcementId/submissions', getSubmissions);

// Delete announcement
router.delete('/:id', deleteAnnouncement);

module.exports = router;