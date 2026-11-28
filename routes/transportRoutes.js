const express = require('express');
const transportController = require('../controllers/transportController');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

const router = express.Router();

// ==========================================
// DRIVERS ROUTES
// ==========================================
router.get('/drivers/next-id', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN'), transportController.getNextDriverId);
router.get('/drivers', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN', 'TEACHER', 'FACULTY', 'STAFF'), transportController.getDrivers);
router.post('/drivers', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN'), transportController.createDriver);
router.get('/drivers/:id', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN', 'TEACHER', 'FACULTY', 'STAFF'), transportController.getDriverById);
router.put('/drivers/:id', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN'), transportController.updateDriver);
router.delete('/drivers/:id', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN'), transportController.deleteDriver);

// ==========================================
// VEHICLES ROUTES
// ==========================================
router.get('/vehicles', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN', 'TEACHER', 'FACULTY', 'STAFF'), transportController.getVehicles);
router.post('/vehicles', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN'), transportController.createVehicle);
router.get('/vehicles/:id', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN', 'TEACHER', 'FACULTY', 'STAFF'), transportController.getVehicleById);
router.put('/vehicles/:id', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN'), transportController.updateVehicle);
router.delete('/vehicles/:id', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN'), transportController.deleteVehicle);

// ==========================================
// BUS ROUTES ROUTES
// ==========================================
router.get('/routes/next-id', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN'), transportController.getNextRouteId);
router.get('/routes', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN', 'STUDENT', 'TEACHER', 'FACULTY', 'STAFF'), transportController.getRoutes);
router.post('/routes', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN'), transportController.createRoute);
router.get('/routes/:id', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN', 'STUDENT', 'TEACHER', 'FACULTY', 'STAFF'), transportController.getRouteById);
router.put('/routes/:id', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN'), transportController.updateRoute);
router.delete('/routes/:id', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN'), transportController.deleteRoute);

// ==========================================
// BUS PASSES ROUTES
// ==========================================
router.get('/passes/next-id', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN'), transportController.getNextPassId);
router.get('/passes', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN', 'STUDENT', 'TEACHER', 'FACULTY', 'STAFF'), transportController.getPasses);
router.post('/passes', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN', 'STUDENT'), transportController.createPass);
router.get('/passes/:id', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN', 'STUDENT', 'TEACHER', 'FACULTY', 'STAFF'), transportController.getPassById);
router.put('/passes/:id', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN'), transportController.updatePass);
router.delete('/passes/:id', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN'), transportController.deletePass);

// Student verification route for bus passes
router.get('/verify-student/:prn', verifyToken, authorizeRole('SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN', 'STUDENT'), transportController.verifyStudentByPRN);

// ==========================================
// STUDENT — MY TRANSPORT (must be before /:id catch-all)
// Returns the authenticated student's bus pass, route & fee record.
// Identity resolved from JWT only — no PRN in URL/body.
// ==========================================
router.get('/my-pass', verifyToken, authorizeRole('STUDENT'), transportController.getMyPass);

module.exports = router;