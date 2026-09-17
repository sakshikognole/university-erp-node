const express = require('express');
const router = express.Router();
const alumniController = require('../controllers/alumniController');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

router.use(verifyToken);

router.get('/', alumniController.getAll);
router.get('/:id', alumniController.getById);
router.post('/bulk', authorizeRole('SUPER_ADMIN', 'ADMIN'), alumniController.bulkUpload);
router.post('/', authorizeRole('SUPER_ADMIN', 'ADMIN'), alumniController.create);
router.put('/:id', authorizeRole('SUPER_ADMIN', 'ADMIN'), alumniController.update);
router.delete('/:id', authorizeRole('SUPER_ADMIN', 'ADMIN'), alumniController.remove);

module.exports = router;
