const mongoose = require('mongoose');

const transportSchema = new mongoose.Schema({
  transportId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    // Custom identifier like BUS-001, VAN-002, etc.
  },
  vehicleNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    // e.g., MH-12-AB-1234
  },
  type: {
    type: String,
    enum: ['BUS', 'VAN', 'MINI_BUS', 'CAR'],
    default: 'BUS',
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  driverName: {
    type: String,
    required: true,
    trim: true
  },
  driverPhone: {
    type: String,
    required: true,
    trim: true
  },
  routeName: {
    type: String,
    required: true,
    trim: true
  },
  routeStops: {
    type: [String],
    default: []
    // Array of bus stop names
  },
  departureTime: {
    type: String,
    // HH:MM format
  },
  arrivalTime: {
    type: String,
    // HH:MM format
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'],
    default: 'ACTIVE'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
transportSchema.index({ transportId: 1 });
transportSchema.index({ vehicleNumber: 1 });
transportSchema.index({ status: 1 });
transportSchema.index({ type: 1 });
transportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transport', transportSchema);