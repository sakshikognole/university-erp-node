const express = require('express');
const router = express.Router();
const feePaymentController = require('../controllers/feePaymentController');

// List fee records with pagination, search, status filtering, and overall summary metrics
router.get('/', feePaymentController.getFeeRecords);

// Get single fee record by ID
router.get('/:id', feePaymentController.getFeeRecordById);

// Create payment order
router.post('/create-order', feePaymentController.createPaymentOrder);

// Verify and record successful payment
router.post('/verify-payment', feePaymentController.verifyPayment);
router.post('/verify', feePaymentController.verifyPayment);

// Record failed payment attempt
router.post('/record-failure', feePaymentController.recordFailedPayment);

// Get receipt by transaction ID / receipt number
router.get('/receipt/:identifier', feePaymentController.getReceipt);

module.exports = router;
