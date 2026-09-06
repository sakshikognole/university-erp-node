const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema(
  {
    venueId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    facilities: {
      type: [{
        name: {
          type: String,
          required: true,
          trim: true,
        },
        details: {
          type: String,
          default: '',
          trim: true,
        },
      }],
      default: [],
    },
    status: {
      type: String,
      required: true,
      enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RESERVED'],
      default: 'ACTIVE',
      uppercase: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Venue', venueSchema);
