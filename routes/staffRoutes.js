const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');

// GET /api/staff (List all staff members)
router.get('/', staffController.getStaff);

// GET /api/staff/:id (Get single staff member by ID or staffId)
router.get('/:id', staffController.getStaffById);

// POST /api/staff (Create new staff member)
router.post('/', staffController.createStaff);

// PUT /api/staff/:id (Update staff member by ID or staffId)
router.put('/:id', staffController.updateStaff);

module.exports = router;
