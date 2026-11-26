const express = require('express');
const router = express.Router();

const venueController = require('../controllers/venueController');

const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

// GET /api/venues - Get all venues
router.get('/', venueController.getVenues);

// GET /api/venues/:id - Get venue by ID or venueId
router.get('/:id', venueController.getVenueById);

// Protected routes - require authentication and admin role
// POST /api/venues/bulk - Bulk create venues (admin only)
router.post('/bulk', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN'), venueController.bulkCreateVenues);

// POST /api/venues - Create new venue (admin only)
router.post('/', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN'), venueController.createVenue);

// PUT /api/venues/:id - Update venue (admin only)
router.put('/:id', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN'), venueController.updateVenue);

// DELETE /api/venues/:id - Delete venue (admin only)
router.delete('/:id', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN'), venueController.deleteVenue);

module.exports = router;
