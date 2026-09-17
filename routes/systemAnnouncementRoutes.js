const express = require('express');
const router = express.Router();
const controller = require('../controllers/systemAnnouncementController');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

// All routes require a valid JWT
router.use(verifyToken);

// ── Download proxy (any authenticated user) ───────────────────────────────────
// GET /api/system-announcements/download-proxy?url=<cloudinary_url>
// Fetches the file server-side and streams it to the browser, bypassing CORS
// and Cloudinary raw-file delivery restrictions.
router.get('/download-proxy', controller.downloadProxy);

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
