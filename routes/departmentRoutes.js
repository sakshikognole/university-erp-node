const express    = require('express');
const router     = express.Router();
const departmentController = require('../controllers/departmentController');
const verifyToken   = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

router.use(verifyToken);

// GET /api/departments — any authenticated user (needed for Add Staff / Add Student dropdowns)
router.get('/', departmentController.getDepartments);

// Write operations — admin only
router.post('/',    authorizeRole('SUPER_ADMIN', 'ADMIN'), departmentController.createDepartment);
router.put('/:id',  authorizeRole('SUPER_ADMIN', 'ADMIN'), departmentController.updateDepartment);
router.delete('/:id', authorizeRole('SUPER_ADMIN', 'ADMIN'), departmentController.deleteDepartment);

module.exports = router;
