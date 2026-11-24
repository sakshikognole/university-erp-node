const express = require('express');
const router = express.Router();
const controller = require('../controllers/systemAnnouncementController');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

// All routes require a valid JWT
router.use(verifyToken);

// ── Download proxy (any authenticated user) ───────────────────────────────────
// GET /api/system-announcements/download-proxy?url=<cloudinary_url>
router.get('/download-proxy', controller.downloadProxy);

// ── View proxy — returns an HTML page embedding the file (PDF, image) ─────────
// GET /api/system-announcements/view-proxy?url=<cloudinary_url>
router.get('/view-proxy', controller.viewProxy);

// ── Unread count (any authenticated user) ─────────────────────────────────────
// GET /api/system-announcements/unread-count
router.get('/unread-count', controller.getUnreadCount);

// ── Mark all as read (any authenticated user) ─────────────────────────────────
// PATCH /api/system-announcements/mark-all-read
router.patch('/mark-all-read', controller.markAllAsRead);

// ── Mark single as read (any authenticated user) ──────────────────────────────
// PATCH /api/system-announcements/:id/read
router.patch('/:id/read', controller.markAsRead);

// ── Read (all authenticated users — students, teachers, admins) ───────────────
router.get('/', controller.getAllAnnouncements);
router.get('/:id', controller.getAnnouncementById);

// ── Write (superadmin, subadmin, teachers/faculty only) ───────────────────────
// No multer middleware — file is uploaded to Cloudinary directly from the
// browser; the backend receives a plain JSON body with a fileUrl string.
router.post(
  '/',
  authorizeRole('SUPER_ADMIN', 'SUB_ADMIN', 'TEACHER', 'FACULTY'),
  controller.createAnnouncement
);

router.put(
  '/:id',
  authorizeRole('SUPER_ADMIN', 'SUB_ADMIN', 'TEACHER', 'FACULTY'),
  controller.updateAnnouncement
);

// ── Delete (superadmin and subadmin only) ────────────────────────────────────
router.delete(
  '/:id',
  authorizeRole('SUPER_ADMIN', 'SUB_ADMIN'),
  controller.deleteAnnouncement
);

module.exports = router;
