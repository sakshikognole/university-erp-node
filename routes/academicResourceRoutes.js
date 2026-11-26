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


// All academic resource operations require authentication
router.use(verifyToken);

// Get all academic resources
router.get('/', getAllAcademicResources);

// Download resource file by ID
router.get('/download/:id', downloadAcademicResource);


// Get resources by subject
router.get('/subject/:subject', getAcademicResourcesBySubject);


// Upload academic resource (Admin / Faculty / Staff only)
router.post(
  '/',
  authorizeRole('SUPER_ADMIN', 'ADMIN', 'FACULTY', 'STAFF'),
  upload.single('file'),
  uploadAcademicResource
);


// Delete academic resource (Admin / Faculty / Staff only)
router.delete(
  '/:id',
  authorizeRole('SUPER_ADMIN', 'ADMIN', 'FACULTY', 'STAFF'),
  deleteAcademicResource
);


module.exports = router;
