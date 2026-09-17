const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
    },
    razorpayPaymentId: {
      type: String,
      default: '',
    },
    razorpayOrderId: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      default: 'Razorpay (Test Mode)',
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'PENDING'],
      default: 'SUCCESS',
    },
    receiptNumber: {
      type: String,
      default: '',
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
    failureReason: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { _id: true, timestamps: true }
);

const feePaymentSchema = new mongoose.Schema(
  {
    prn: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    class: {
      type: String,
      required: true,
      trim: true,
    },
    division: {
      type: String,
      default: '',
      trim: true,
    },
    degree: {
      type: String,
      required: true,
      trim: true,
    },
    academicYear: {
      type: String,
      required: true,
      default: '2025-2026',
      trim: true,
    },
    semester: {
      type: String,
      default: 'Semester 1',
      trim: true,
    },
    feeType: {
      type: String,
      required: true,
      default: 'Academic & Tuition Fee',
      trim: true,
    },
    totalFeeAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'],
      default: 'PENDING',
    },
    dueDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    transactions: {
      type: [transactionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Auto-calculate remaining amount and status before saving
feePaymentSchema.pre('validate', function () {
  const netPayable = Math.max(0, (this.totalFeeAmount || 0) - (this.discountAmount || 0));
  this.remainingAmount = Math.max(0, netPayable - (this.paidAmount || 0));

  if (this.paidAmount >= netPayable && netPayable > 0) {
    this.status = 'PAID';
  } else if (this.paidAmount > 0 && this.paidAmount < netPayable) {
    this.status = 'PARTIAL';
  } else {
    this.status = 'PENDING';
  }
});

module.exports = mongoose.model('FeePayment', feePaymentSchema);
