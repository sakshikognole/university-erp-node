const express = require('express');
const multer = require('multer');

const {
  uploadAcademicResource,
  downloadAcademicResource,
  getAllAcademicResources,
  getAcademicResourcesBySubject,
  deleteAcademicResource
} = require('../controllers/academicResourceController');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

const router = express.Router();


// Multer configuration
const upload = multer({
  storage: multer.memoryStorage()
});


// Test route
router.get('/test', (req, res) => {
  res.json({
    message: 'Academic resource route is working'
  });
});


// Download resource file by ID (placed before verifyToken to allow direct browser tab downloads)
router.get('/download/:id', downloadAcademicResource);

// All academic resource operations require authentication
router.use(verifyToken);

// Get all academic resources
router.get('/', getAllAcademicResources);

// Get resources by subject
router.get('/subject/:subject', getAcademicResourcesBySubject);

// Upload academic resource (Admin / Sub-admin / Faculty / Teacher / Staff)
router.post(
  '/',
  authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN', 'FACULTY', 'TEACHER', 'STAFF'),
  upload.single('file'),
  uploadAcademicResource
);

// Delete academic resource (Admin / Sub-admin / Faculty / Teacher / Staff)
router.delete(
  '/:id',
  authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN', 'FACULTY', 'TEACHER', 'STAFF'),
  deleteAcademicResource
);


module.exports = router;