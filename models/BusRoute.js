const mongoose = require('mongoose');

const busRouteSchema = new mongoose.Schema(
  {
    routeId: {
      type: Number,
      unique: true,
      required: [true, 'Route ID is required'],
      index: true,
    },
    hasCustomName: {
      type: Boolean,
      default: false,
    },
    routeName: {
      type: String,
      trim: true,
      default: '',
    },
    driverId: {
      type: Number,
      default: null,
    },
    driverName: {
      type: String,
      required: [true, 'Driver Name is required'],
      trim: true,
    },
    vehicleId: {
      type: String,
      default: '',
    },
    vehicleName: {
      type: String,
      required: [true, 'Vehicle Name is required'],
      trim: true,
    },
    stops: {
      type: [String],
      default: [],
    },
    fee: {
      type: Number,
      default: 0,
      min: [0, 'Fee cannot be negative'],
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'Visible', 'Pending', 'VISIBLE', 'PENDING'],
      default: 'Visible',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('BusRoute', busRouteSchema);
