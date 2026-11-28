const express    = require('express');
const router     = express.Router();
const roleController = require('../controllers/roleController');
const verifyToken    = require('../middleware/verifyToken');
const authorizeRole  = require('../middleware/authorizeRole');

// ── Authenticated routes (all logged-in users can fetch role permissions) ──
router.use(verifyToken);

// GET /api/roles — list all roles (any authenticated user; frontend needs it for page-perm checks)
router.get('/', roleController.getRoles);

// GET /api/roles/pages — list all assignable page paths
router.get('/pages', authorizeRole('SUPER_ADMIN'), roleController.getAvailablePages);

// SUPER_ADMIN-only write operations
router.post('/',    authorizeRole('SUPER_ADMIN'), roleController.createRole);
router.put('/:id',  authorizeRole('SUPER_ADMIN'), roleController.updateRole);
router.delete('/:id', authorizeRole('SUPER_ADMIN'), roleController.deleteRole);

module.exports = router;
