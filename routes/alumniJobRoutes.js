const express = require('express');
const router = express.Router();
const alumniJobController = require('../controllers/alumniJobController');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

router.use(verifyToken);

router.get('/', alumniJobController.getAll);
router.get('/:id', alumniJobController.getById);
router.post('/', authorizeRole('SUPER_ADMIN', 'ADMIN'), alumniJobController.create);
router.put('/:id', authorizeRole('SUPER_ADMIN', 'ADMIN'), alumniJobController.update);
router.delete('/:id', authorizeRole('SUPER_ADMIN', 'ADMIN'), alumniJobController.remove);

module.exports = router;
