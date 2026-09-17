const express = require('express');
const transportController = require('../controllers/transportController');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

const router = express.Router();

// ==========================================
// DRIVERS ROUTES
// ==========================================
router.get('/drivers/next-id', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.getNextDriverId);
router.get('/drivers', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.getDrivers);
router.post('/drivers', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.createDriver);
router.get('/drivers/:id', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.getDriverById);
router.put('/drivers/:id', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.updateDriver);
router.delete('/drivers/:id', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.deleteDriver);

// ==========================================
// VEHICLES ROUTES
// ==========================================
router.get('/vehicles', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.getVehicles);
router.post('/vehicles', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.createVehicle);
router.get('/vehicles/:id', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.getVehicleById);
router.put('/vehicles/:id', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.updateVehicle);
router.delete('/vehicles/:id', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.deleteVehicle);

// ==========================================
// BUS ROUTES ROUTES
// ==========================================
router.get('/routes/next-id', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.getNextRouteId);
router.get('/routes', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.getRoutes);
router.post('/routes', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.createRoute);
router.get('/routes/:id', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.getRouteById);
router.put('/routes/:id', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.updateRoute);
router.delete('/routes/:id', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.deleteRoute);

// ==========================================
// BUS PASSES ROUTES
// ==========================================
router.get('/passes/next-id', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.getNextPassId);
router.get('/passes', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.getPasses);
router.post('/passes', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.createPass);
router.get('/passes/:id', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.getPassById);
router.put('/passes/:id', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.updatePass);
router.delete('/passes/:id', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.deletePass);

// Student verification route for bus passes
router.get('/verify-student/:prn', verifyToken, authorizeRole('SUPER_ADMIN'), transportController.verifyStudentByPRN);

module.exports = router;