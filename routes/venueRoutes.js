const express = require('express');
const router = express.Router();

const venueController = require('../controllers/venueController');

const verifyToken = require('../middleware/verifyToken');

// Public routes (or you can add verifyToken if authentication is required)
// GET /api/venues - Get all venues
router.get('/', venueController.getVenues);

// GET /api/venues/:id - Get venue by ID or venueId
router.get('/:id', venueController.getVenueById);

// Protected routes - require authentication
// POST /api/venues/bulk - Bulk create venues (admin only)
router.post('/bulk', verifyToken, venueController.bulkCreateVenues);

// POST /api/venues - Create new venue (admin only)
router.post('/', verifyToken, venueController.createVenue);

// PUT /api/venues/:id - Update venue (admin only)
router.put('/:id', verifyToken, venueController.updateVenue);

// DELETE /api/venues/:id - Delete venue (admin only)
router.delete('/:id', verifyToken, venueController.deleteVenue);

module.exports = router;
