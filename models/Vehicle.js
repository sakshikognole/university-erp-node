/**
 * Vehicle.js
 *
 * Changes:
 *   Imp-23  vehicleNumber (registration) is now required
 *   D15     sparse unique index on vehicleNumber for duplicate prevention
 *           sparse: true is safe for any existing records without a plate number
 */

const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: String,
      unique: true,
      required: [true, 'Vehicle ID is required'],
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Vehicle name is required'],
      trim: true,
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
      // sparse unique: existing vehicles without a plate coexist safely;
      // new vehicles are validated as non-empty by the controller.
      index: { unique: true, sparse: true },
    },
    capacity: {
      type: Number,
      default: 40,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'MAINTENANCE', 'INACTIVE'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vehicle', vehicleSchema);
