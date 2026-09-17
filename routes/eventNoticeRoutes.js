const express = require('express');
const router = express.Router();
const eventNoticeController = require('../controllers/eventNoticeController');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

// Public routes (no authentication required)
router.get('/upcoming', eventNoticeController.getUpcomingEvents);
router.get('/public', eventNoticeController.getAllEventNotices);
router.get('/:id', eventNoticeController.getEventNoticeById);
router.get('/event-id/:eventId', eventNoticeController.getEventNoticeByEventId);

// Protected routes (require authentication)
router.use(verifyToken);

// No multer middleware — image is uploaded to Cloudinary directly from the
// browser; the backend receives a plain JSON body with an imageUrl string.
router.post(
  '/',
  authorizeRole('STAFF', 'FACULTY', 'ADMIN', 'SUPER_ADMIN'),
  eventNoticeController.createEventNotice
);

router.get('/', eventNoticeController.getAllEventNotices);

router.put(
  '/:id',
  authorizeRole('STAFF', 'FACULTY', 'ADMIN', 'SUPER_ADMIN'),
  eventNoticeController.updateEventNotice
);

router.patch(
  '/:id/publish',
  authorizeRole('STAFF', 'FACULTY', 'ADMIN', 'SUPER_ADMIN'),
  eventNoticeController.publishEventNotice
);

router.delete(
  '/:id',
  authorizeRole('ADMIN', 'SUPER_ADMIN'),
  eventNoticeController.deleteEventNotice
);

module.exports = router;
