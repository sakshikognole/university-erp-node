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
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('BusRoute', busRouteSchema);
