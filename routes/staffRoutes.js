const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

// Require authentication for all staff routes
router.use(verifyToken);

// GET /api/staff (List all staff members)
router.get('/', staffController.getStaff);

// GET /api/staff/:id (Get single staff member by ID or staffId)
router.get('/:id', staffController.getStaffById);

// POST /api/staff (Create new staff member - admin only)
router.post('/', authorizeRole('SUPER_ADMIN', 'ADMIN'), staffController.createStaff);

// PUT /api/staff/:id (Update staff member by ID or staffId - admin only)
router.put('/:id', authorizeRole('SUPER_ADMIN', 'ADMIN'), staffController.updateStaff);

module.exports = router;
