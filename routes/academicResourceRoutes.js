const express = require('express');
const multer = require('multer');

const {
  uploadAcademicResource,
  getAllAcademicResources,
  getAcademicResourcesBySubject,
  deleteAcademicResource
} = require('../controllers/academicResourceController');

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


// Get all academic resources
router.get('/', getAllAcademicResources);


// Get resources by subject
router.get('/subject/:subject', getAcademicResourcesBySubject);


// Upload academic resource
router.post(
  '/',
  upload.single('file'),
  uploadAcademicResource
);


// Delete academic resource
router.delete(
  '/:id',
  deleteAcademicResource
);


module.exports = router;