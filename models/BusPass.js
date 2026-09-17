const mongoose = require('mongoose');

const busPassSchema = new mongoose.Schema(
  {
    passId: {
      type: String,
      unique: true,
      required: [true, 'Pass ID is required'],
      trim: true,
      index: true,
    },
    studentId: {
      type: String,
      required: [true, 'Student ID is required'],
      trim: true,
      index: true,
    },
    studentName: {
      type: String,
      trim: true,
      default: '',
    },
    routeId: {
      type: Number,
      required: [true, 'Route ID is required'],
      index: true,
    },
    fromStop: {
      type: String,
      required: [true, 'From stop is required'],
      trim: true,
    },
    toStop: {
      type: String,
      required: [true, 'To stop is required'],
      default: 'University Campus',
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'PENDING', 'FAILED'],
      default: 'PAID',
    },
    validTill: {
      type: Date,
      required: [true, 'Validity date is required'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('BusPass', busPassSchema);
