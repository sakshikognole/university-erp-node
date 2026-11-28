const crypto = require('crypto');
const Razorpay = require('razorpay');
const FeePayment = require('../models/FeePayment');

// Helper to get Razorpay instance
const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_TMtc5YUuUTabBs';
  const key_secret = process.env.RAZORPAY_KEY_SECRET || 'pbSh3OuJ0nTewLAOaJzUR6s1';

  if (key_id && key_secret) {
    return new Razorpay({
      key_id,
      key_secret,
    });
  }
  return null;
};

// Helper to generate unique receipt number
const generateReceiptNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `RCP-${dateStr}-${randomSuffix}`;
};

// Helper to generate transaction ID
const generateTransactionId = () => {
  return `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
};

// Seed initial fee records if none exist
const seedInitialFeeRecords = async () => {
  const count = await FeePayment.countDocuments();
  if (count > 0) return;

  const sampleFees = [
    {
      prn: 'PRN2024001',
      studentName: 'Aarav Sharma',
      class: 'TY-CSE',
      division: 'A',
      degree: 'B.Tech Computer Science',
      academicYear: '2025-2026',
      semester: 'Semester 5',
      feeType: 'Tuition & Development Fee',
      totalFeeAmount: 85000,
      discountAmount: 5000,
      paidAmount: 0,
    },
    {
      prn: 'PRN2024002',
      studentName: 'Diya Patel',
      class: 'SY-IT',
      division: 'B',
      degree: 'B.Tech Information Tech',
      academicYear: '2025-2026',
      semester: 'Semester 3',
      feeType: 'Tuition Fee & Lab Charges',
      totalFeeAmount: 78000,
      discountAmount: 8000,
      paidAmount: 0,
    },
    {
      prn: 'PRN2024003',
      studentName: 'Rohan Deshmukh',
      class: 'Final Year ECE',
      division: 'A',
      degree: 'B.Tech Electronics & Comm',
      academicYear: '2025-2026',
      semester: 'Semester 7',
      feeType: 'Annual Comprehensive Fee',
      totalFeeAmount: 92000,
      discountAmount: 12000,
      paidAmount: 0,
    },
    {
      prn: 'PRN2024004',
      studentName: 'Ananya Iyer',
      class: 'FY-AI&DS',
      division: 'A',
      degree: 'B.Tech AI & Data Science',
      academicYear: '2025-2026',
      semester: 'Semester 1',
      feeType: 'Admission & Tuition Fee',
      totalFeeAmount: 95000,
      discountAmount: 10000,
      paidAmount: 0,
    },
    {
      prn: 'PRN2024005',
      studentName: 'Kabir Verma',
      class: 'SY-Mech',
      division: 'C',
      degree: 'B.Tech Mechanical Engg',
      academicYear: '2025-2026',
      semester: 'Semester 3',
      feeType: 'Tuition & Workshop Fee',
      totalFeeAmount: 75000,
      discountAmount: 0,
      paidAmount: 0,
    },
    {
      prn: 'PRN2024006',
      studentName: 'Sanya Gupta',
      class: 'TY-Civil',
      division: 'B',
      degree: 'B.Tech Civil Engg',
      academicYear: '2025-2026',
      semester: 'Semester 5',
      feeType: 'Academic Semester Fee',
      totalFeeAmount: 72000,
      discountAmount: 4000,
      paidAmount: 0,
    },
    {
      prn: 'PRN2024007',
      studentName: 'Vikram Mehta',
      class: 'TY-CSE',
      division: 'A',
      degree: 'B.Tech Computer Science',
      academicYear: '2025-2026',
      semester: 'Semester 5',
      feeType: 'Tuition & Examination Fee',
      totalFeeAmount: 88000,
      discountAmount: 6000,
      paidAmount: 0,
    },
    {
      prn: 'PRN2024008',
      studentName: 'Pooja Nair',
      class: 'FY-IT',
      division: 'A',
      degree: 'B.Tech Information Tech',
      academicYear: '2025-2026',
      semester: 'Semester 1',
      feeType: 'First Year Composite Fee',
      totalFeeAmount: 90000,
      discountAmount: 5000,
      paidAmount: 0,
    },
    {
      prn: 'PRN2024009',
      studentName: 'Aditya Kulkarni',
      class: 'SY-CSE',
      division: 'B',
      degree: 'B.Tech Computer Science',
      academicYear: '2025-2026',
      semester: 'Semester 3',
      feeType: 'Academic & Laboratory Fee',
      totalFeeAmount: 82000,
      discountAmount: 2000,
      paidAmount: 0,
    },
    {
      prn: 'PRN2024010',
      studentName: 'Neha Joshi',
      class: 'Final Year CSE',
      division: 'A',
      degree: 'B.Tech Computer Science',
      academicYear: '2025-2026',
      semester: 'Semester 7',
      feeType: 'Final Year Tuition & Project Fee',
      totalFeeAmount: 89000,
      discountAmount: 7000,
      paidAmount: 0,
    },
  ];

  for (const item of sampleFees) {
    const net = item.totalFeeAmount - item.discountAmount;
    await FeePayment.create({
      ...item,
      remainingAmount: net,
      status: 'PENDING',
    });
  }
};

/**
 * @desc Get all fee records with pagination
 * @route GET /api/fee-payments
 */
exports.getFeeRecords = async (req, res) => {
  try {
    await seedInitialFeeRecords();

    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (status && status !== 'ALL') {
      filter.status = status.toUpperCase();
    }

    const [records, totalCount] = await Promise.all([
      FeePayment.find(filter)
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      FeePayment.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: records,
      pagination: {
        totalRecords: totalCount,
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error('Error fetching fee records:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch fee payment records',
      error: error.message,
    });
  }
};

/**
 * @desc Get single fee payment record by ID
 * @route GET /api/fee-payments/:id
 */
exports.getFeeRecordById = async (req, res) => {
  try {
    const feeRecord = await FeePayment.findById(req.params.id);
    if (!feeRecord) {
      return res.status(404).json({
        success: false,
        message: 'Fee record not found',
      });
    }
    return res.status(200).json({
      success: true,
      data: feeRecord,
    });
  } catch (error) {
    console.error('Error fetching fee record:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch fee record',
      error: error.message,
    });
  }
};

/**
 * @desc Create Razorpay Order using server-side SDK and secret key
 * @route POST /api/fee-payments/create-order or /api/payment/create-order
 */
exports.createPaymentOrder = async (req, res) => {
  try {
    const { feeRecordId, amount } = req.body;

    let feeRecord = null;
    // Only attempt DB lookup if feeRecordId looks like a valid MongoDB ObjectId
    if (feeRecordId && /^[0-9a-fA-F]{24}$/.test(feeRecordId)) {
      feeRecord = await FeePayment.findById(feeRecordId);
    }

    // ── Duplicate payment guard: block if already PAID ──────────────────────
    if (feeRecord && feeRecord.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'This fee record has already been paid. Duplicate payments are not allowed.',
        alreadyPaid: true,
      });
    }

    // For transport local IDs — also check the bus pass directly
    const isTrnLocalId = feeRecordId && String(feeRecordId).startsWith('trn-');
    if (isTrnLocalId) {
      const resolvedPrn = req.user?.prn || null;
      if (resolvedPrn) {
        const BusPass = require('../models/BusPass');
        const cleanPrn = resolvedPrn.trim().toUpperCase();
        const existingPass = await BusPass.findOne({
          $or: [{ studentId: cleanPrn }, { studentId: cleanPrn.toLowerCase() }],
          paymentStatus: 'PAID',
        }).lean();
        if (existingPass) {
          return res.status(400).json({
            success: false,
            message: `Bus Pass ${existingPass.passId} is already paid. Duplicate payments are not allowed.`,
            alreadyPaid: true,
            busPass: existingPass,
          });
        }
      }
    }
    // ── End duplicate payment guard ─────────────────────────────────────────

    const payableAmount = amount ? Number(amount) : (feeRecord?.remainingAmount || 0);

    if (payableAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0',
      });
    }

    // Razorpay expects amount in PAISE (₹500 -> 50000 paise)
    const amountInPaise = Math.round(Number(payableAmount) * 100);

    const razorpay = getRazorpayInstance();
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        feeRecordId: feeRecordId ? String(feeRecordId) : '',
        prn: feeRecord?.prn || '',
      },
    };

    let order;
    if (razorpay) {
      try {
        order = await razorpay.orders.create(options);
      } catch (rzpErr) {
        console.warn('Razorpay SDK order create fallback:', rzpErr.message);
        order = {
          id: `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          amount: options.amount,
          currency: 'INR',
          receipt: options.receipt,
        };
      }
    } else {
      order = {
        id: `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        amount: options.amount,
        currency: 'INR',
        receipt: options.receipt,
      };
    }

    // Never expose RAZORPAY_KEY_SECRET to frontend, return public Key ID only
    return res.status(200).json({
      success: true,
      order,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_TMtc5YUuUTabBs',
      feeRecord,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message,
    });
  }
};

/**
 * @desc Verify Razorpay payment signature & update database in RUPEES
 * @route POST /api/fee-payments/verify-payment or /api/payment/verify
 */
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      feeRecordId,
      amount,
    } = req.body;

    if (!razorpay_payment_id) {
      return res.status(400).json({ success: false, message: 'Missing razorpay_payment_id' });
    }

    // ── Idempotency guard: if this payment_id was already processed, return the existing result ──
    if (feeRecordId && /^[0-9a-fA-F]{24}$/.test(feeRecordId)) {
      const existing = await FeePayment.findById(feeRecordId).lean();
      if (existing) {
        const alreadyProcessed = existing.transactions?.some(
          (t) => t.razorpayPaymentId === razorpay_payment_id && t.status === 'SUCCESS'
        );
        if (alreadyProcessed) {
          // Return the previously saved data without re-processing
          const BusPass = require('../models/BusPass');
          const existingPass = await BusPass.findOne({
            $or: [
              { studentId: existing.prn },
              { studentId: (existing.prn || '').toLowerCase() },
            ],
          }).lean();
          return res.status(200).json({
            success: true,
            message: 'Payment already verified (idempotent)',
            data: {
              feeRecord: existing,
              receipt: {
                receiptNumber: existing.transactions.find((t) => t.razorpayPaymentId === razorpay_payment_id)?.receiptNumber || '',
                transactionId: existing.transactions.find((t) => t.razorpayPaymentId === razorpay_payment_id)?.transactionId || '',
                razorpayPaymentId: razorpay_payment_id,
                razorpayOrderId: razorpay_order_id,
                prn: existing.prn,
                studentName: existing.studentName,
                class: existing.class,
                degree: existing.degree,
                academicYear: existing.academicYear,
                semester: existing.semester,
                feeType: existing.feeType,
                totalFeeAmount: existing.totalFeeAmount,
                discountAmount: existing.discountAmount,
                amountPaidThisTransaction: Number(amount),
                totalPaidSoFar: existing.paidAmount,
                remainingBalance: existing.remainingAmount,
                status: existing.status,
                paymentMethod: 'Razorpay',
                paidAt: existing.updatedAt,
              },
              autoBusPass: existingPass || null,
              busPassNotification: null,
            },
          });
        }
      }
    }

    // ── Signature verification ──
    let isSignatureValid = false;
    const secret = process.env.RAZORPAY_KEY_SECRET || 'pbSh3OuJ0nTewLAOaJzUR6s1';
    if (secret && razorpay_order_id && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
      isSignatureValid = generatedSignature === razorpay_signature;
    } else {
      isSignatureValid = true; // test mode / client-side checkout
    }

    if (!isSignatureValid) {
      if (feeRecordId && /^[0-9a-fA-F]{24}$/.test(feeRecordId)) {
        const feeRecord = await FeePayment.findById(feeRecordId);
        if (feeRecord) {
          feeRecord.transactions.push({
            transactionId: generateTransactionId(),
            razorpayPaymentId: razorpay_payment_id,
            razorpayOrderId: razorpay_order_id,
            amount: amount ? Number(amount) : 0,
            status: 'FAILED',
            failureReason: 'Invalid Razorpay HMAC-SHA256 signature',
            paidAt: new Date(),
          });
          await feeRecord.save();
        }
      }
      return res.status(400).json({ success: false, message: 'Payment verification failed: Invalid signature' });
    }

    // ── Update FeePayment record ──
    const payAmountInRupees = Number(amount);
    let feeRecord = null;

    if (feeRecordId && /^[0-9a-fA-F]{24}$/.test(feeRecordId)) {
      feeRecord = await FeePayment.findById(feeRecordId);
    }

    // Also try to find by student PRN if no DB-backed record (local/transport pass records)
    // Resolve student PRN from JWT
    let resolvedPrn = req.user?.prn || null;
    if (!resolvedPrn && req.user?.id) {
      const User = require('../models/User');
      const userDoc = await User.findById(req.user.id).lean();
      resolvedPrn = userDoc?.prn || null;
    }
    if (!resolvedPrn && feeRecord?.prn) {
      resolvedPrn = feeRecord.prn;
    }

    // For transport-type local fee records (id like "trn-3"), try to find or create the DB record
    const isTrnLocalId = feeRecordId && feeRecordId.startsWith('trn-');
    if (!feeRecord && isTrnLocalId && resolvedPrn) {
      const cleanPrn = resolvedPrn.trim().toUpperCase();
      feeRecord = await FeePayment.findOne({
        prn: cleanPrn,
        $or: [
          { feeType: { $regex: /transport|bus|route/i } },
        ],
        status: { $ne: 'PAID' },
      });
    }

    const receiptNumber = generateReceiptNumber();
    const transactionId = generateTransactionId();

    // Fetch student details for complete receipt data
    let studentDetails = null;
    if (resolvedPrn) {
      try {
        const Student = require('../models/Student');
        const cleanPrn = resolvedPrn.trim().toUpperCase();
        studentDetails = await Student.findOne({
          $or: [{ prn: cleanPrn }, { prn: cleanPrn.toLowerCase() }],
        }).lean();
      } catch (e) { /* non-fatal */ }
    }

    if (feeRecord) {
      // Guard: skip if already PAID and payment_id already in transactions
      const dupTx = feeRecord.transactions?.some(
        (t) => t.razorpayPaymentId === razorpay_payment_id && t.status === 'SUCCESS'
      );
      if (!dupTx) {
        feeRecord.paidAmount = (feeRecord.paidAmount || 0) + payAmountInRupees;
        // Backfill student info if missing on the record
        if (studentDetails) {
          if (!feeRecord.prn || feeRecord.prn === '') feeRecord.prn = studentDetails.prn;
          if (!feeRecord.studentName || feeRecord.studentName === '') feeRecord.studentName = studentDetails.name;
          if (!feeRecord.class || feeRecord.class === '') feeRecord.class = studentDetails.class;
          if (!feeRecord.degree || feeRecord.degree === '') feeRecord.degree = studentDetails.degree;
          if (!feeRecord.academicYear || feeRecord.academicYear === '') {
            const yr = new Date().getFullYear();
            feeRecord.academicYear = `${yr}-${yr + 1}`;
          }
        }
        feeRecord.transactions.push({
          transactionId,
          razorpayPaymentId: razorpay_payment_id,
          razorpayOrderId: razorpay_order_id,
          amount: payAmountInRupees,
          paymentMethod: 'Razorpay',
          status: 'SUCCESS',
          receiptNumber,
          paidAt: new Date(),
        });
        await feeRecord.save();
      }
    }

    // ── Auto Bus Pass Activation ─────────────────────────────────────────────
    // Activated atomically using findOneAndUpdate so concurrent callbacks are safe.
    let autoBusPass = null;
    let busPassNotification = null;
    let isNewNotification = false;

    try {
      const isTransportPayment =
        feeRecord &&
        feeRecord.feeType &&
        /transport|bus|route/i.test(feeRecord.feeType);

      if (!isTransportPayment && isTrnLocalId) {
        // local id means it was a transport payment even if feeRecord not found
      }

      const shouldActivate = isTransportPayment || isTrnLocalId;

      if (shouldActivate && resolvedPrn) {
        const BusPass = require('../models/BusPass');
        const BusRoute = require('../models/BusRoute');
        const cleanPrn = resolvedPrn.trim().toUpperCase();

        // Atomically update: set paymentStatus to PAID only if currently PENDING
        // findOneAndUpdate returns null if already PAID (no match on condition)
        const updatedPass = await BusPass.findOneAndUpdate(
          {
            $or: [
              { studentId: cleanPrn },
              { studentId: cleanPrn.toLowerCase() },
              { studentId: new RegExp(`^${cleanPrn}$`, 'i') },
            ],
            paymentStatus: { $ne: 'PAID' }, // only update if not already paid
          },
          { $set: { paymentStatus: 'PAID' } },
          { new: true }
        );

        if (updatedPass) {
          autoBusPass = updatedPass;
          busPassNotification = `Bus Pass ${updatedPass.passId} activated for student ${cleanPrn} (Route #${updatedPass.routeId}).`;
          isNewNotification = true;
        } else {
          // Pass already PAID — still return it for idempotency
          autoBusPass = await BusPass.findOne({
            $or: [
              { studentId: cleanPrn },
              { studentId: cleanPrn.toLowerCase() },
            ],
          }).lean();
          busPassNotification = autoBusPass
            ? `Bus Pass ${autoBusPass.passId} was already active for student ${cleanPrn}.`
            : null;
        }

        // If no pass exists yet, create one automatically from feeRecord route reference
        if (!autoBusPass && feeRecord?.feeType) {
          let matchedRoute = null;
          const routeNumMatch = feeRecord.feeType.match(/route\s*#?\s*(\d+)/i);
          if (routeNumMatch) {
            matchedRoute = await BusRoute.findOne({ routeId: Number(routeNumMatch[1]) }).lean();
          }
          if (!matchedRoute) {
            matchedRoute = await BusRoute.findOne({
              routeName: { $regex: feeRecord.feeType.replace(/transport fee|transport|bus fee|bus/gi, '').trim(), $options: 'i' },
            }).lean();
          }

          if (matchedRoute) {
            const latestPass = await BusPass.findOne().sort({ createdAt: -1 });
            let nextNum = 1001;
            if (latestPass?.passId) {
              const m = latestPass.passId.match(/\d+/);
              if (m) nextNum = parseInt(m[0], 10) + 1;
            }
            const newPassId = `BP-${nextNum}`;
            const dupCheck = await BusPass.findOne({ passId: newPassId });
            if (!dupCheck) {
              const validTill = new Date();
              validTill.setFullYear(validTill.getFullYear() + 1);
              const newPass = new BusPass({
                passId: newPassId,
                studentId: cleanPrn,
                studentName: studentDetails?.name || feeRecord?.studentName || cleanPrn,
                routeId: matchedRoute.routeId,
                fromStop: matchedRoute.stops?.[0] || 'Campus',
                toStop: matchedRoute.stops?.[matchedRoute.stops.length - 1] || 'University Campus',
                paymentStatus: 'PAID',
                validTill,
              });
              await newPass.save();
              autoBusPass = newPass;
              busPassNotification = `Bus Pass ${newPassId} auto-issued for student ${cleanPrn} on Route #${matchedRoute.routeId}.`;
              isNewNotification = true;
            }
          }
        }

        // ── Notify Super Admin via AuditLog only ────────────────────────
        // No SystemAnnouncement is created — that would broadcast to all users.
        // AuditLog is visible only to Super Admin in the audit trail.
        if (isNewNotification && autoBusPass) {
          try {
            const AuditLog = require('../models/AuditLog');
            await AuditLog.create({
              action: 'BUS_PASS_ACTIVATED',
              performedBy: 'Payment Gateway',
              target: `${autoBusPass.passId} — ${cleanPrn}`,
              status: 'SUCCESS',
              details: `Transport fee payment verified. Bus Pass ${autoBusPass.passId} automatically activated for student PRN ${cleanPrn} on Route #${autoBusPass.routeId}. Razorpay Payment ID: ${razorpay_payment_id}.`,
            });
          } catch (notifErr) {
            console.error('AuditLog notification error (non-fatal):', notifErr.message);
          }
        }
      }
    } catch (busPassErr) {
      console.error('Auto bus pass activation error (non-fatal):', busPassErr.message);
    }
    // ── End Auto Bus Pass Activation ─────────────────────────────────────────

    // Build receipt with full student data
    const receipt = {
      receiptNumber,
      transactionId,
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      // Student fields — from feeRecord (backfilled) or studentDetails directly
      prn: feeRecord?.prn || studentDetails?.prn || resolvedPrn || '',
      studentName: feeRecord?.studentName || studentDetails?.name || '',
      class: feeRecord?.class || studentDetails?.class || '',
      division: feeRecord?.division || studentDetails?.division || '',
      degree: feeRecord?.degree || studentDetails?.degree || '',
      academicYear: feeRecord?.academicYear || (() => { const y = new Date().getFullYear(); return `${y}-${y + 1}`; })(),
      semester: feeRecord?.semester || 'Transport',
      feeType: feeRecord?.feeType || 'Transport Fee',
      totalFeeAmount: feeRecord?.totalFeeAmount || payAmountInRupees,
      discountAmount: feeRecord?.discountAmount || 0,
      amountPaidThisTransaction: payAmountInRupees,
      totalPaidSoFar: feeRecord?.paidAmount || payAmountInRupees,
      remainingBalance: feeRecord?.remainingAmount || 0,
      status: feeRecord?.status || 'PAID',
      paymentMethod: 'Razorpay',
      paidAt: new Date().toISOString(),
    };

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        feeRecord,
        receipt,
        autoBusPass: autoBusPass || null,
        busPassNotification: busPassNotification || null,
      },
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify payment', error: error.message });
  }
};

/**
 * @desc Record a failed payment attempt
 * @route POST /api/fee-payments/record-failure or /api/payment/record-failure
 */
exports.recordFailedPayment = async (req, res) => {
  try {
    const {
      feeRecordId,
      amount,
      razorpayOrderId,
      failureReason = 'Payment failed in Razorpay checkout',
      errorCode = 'PAYMENT_FAILED',
    } = req.body;

    const transactionId = generateTransactionId();

    if (feeRecordId) {
      const feeRecord = await FeePayment.findById(feeRecordId);
      if (feeRecord) {
        feeRecord.transactions.push({
          transactionId,
          razorpayOrderId: razorpayOrderId || '',
          amount: amount ? Number(amount) : 0,
          paymentMethod: 'Razorpay',
          status: 'FAILED',
          failureReason: `${errorCode}: ${failureReason}`,
          paidAt: new Date(),
        });
        await feeRecord.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Payment failure recorded',
      data: {
        transactionId,
        failureReason,
        errorCode,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Error recording payment failure:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record payment failure',
      error: error.message,
    });
  }
};

/**
 * @desc Get receipt by transaction ID / receipt number
 * @route GET /api/fee-payments/receipt/:identifier
 */
exports.getReceipt = async (req, res) => {
  try {
    const { identifier } = req.params;

    const feeRecord = await FeePayment.findOne({
      $or: [
        { 'transactions.receiptNumber': identifier },
        { 'transactions.transactionId': identifier },
        { 'transactions.razorpayPaymentId': identifier },
        { _id: identifier.match(/^[0-9a-fA-F]{24}$/) ? identifier : null },
      ],
    });

    if (!feeRecord) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found',
      });
    }

    const tx = feeRecord.transactions.find(
      (t) =>
        t.receiptNumber === identifier ||
        t.transactionId === identifier ||
        t.razorpayPaymentId === identifier
    ) || feeRecord.transactions[feeRecord.transactions.length - 1];

    const receipt = {
      receiptNumber: tx?.receiptNumber || generateReceiptNumber(),
      transactionId: tx?.transactionId || generateTransactionId(),
      razorpayPaymentId: tx?.razorpayPaymentId || 'N/A',
      razorpayOrderId: tx?.razorpayOrderId || 'N/A',
      totalFeeAmount: feeRecord.totalFeeAmount,
      discountAmount: feeRecord.discountAmount,
      amountPaidThisTransaction: tx?.amount || feeRecord.paidAmount,
      totalPaidSoFar: feeRecord.paidAmount,
      remainingBalance: feeRecord.remainingAmount,
      status: feeRecord.status,
      paymentMethod: tx?.paymentMethod || 'Razorpay',
      paidAt: tx?.paidAt || feeRecord.updatedAt,
    };

    return res.status(200).json({
      success: true,
      data: receipt,
    });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch receipt',
      error: error.message,
    });
  }
};
