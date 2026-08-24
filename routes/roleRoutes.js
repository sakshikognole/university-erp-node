const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');

// GET /api/roles (List all roles with counts)
router.get('/', roleController.getRoles);

// POST /api/roles (Create new custom role)
router.post('/', roleController.createRole);

// PUT /api/roles/:id (Update role details & permissions)
router.put('/:id', roleController.updateRole);

// DELETE /api/roles/:id (Delete custom role)
router.delete('/:id', roleController.deleteRole);

module.exports = router;
