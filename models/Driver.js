/**
 * Driver.js
 *
 * Changes:
 *   Imp-21  licenseNumber is now required and unique (case-normalized to uppercase)
 *   D12     sparse unique index so existing docs without a licenseNumber are safe
 *            until they are updated; the controller enforces non-empty for new records.
 */

const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    driverId: {
      type: Number,
      unique: true,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Driver name is required'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    licenseNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
      // sparse: true allows existing docs without a value to coexist;
      // new records are validated as non-empty by the controller.
      index: { unique: true, sparse: true },
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ON_LEAVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Driver', driverSchema);
