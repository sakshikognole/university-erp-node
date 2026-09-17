const mongoose = require('mongoose');

const alumniJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    alumniId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    applicationLink: {
      type: String,
      trim: true,
      default: '',
    },
    datePosted: {
      type: Date,
      default: null,
    },
    dateOfExpiry: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compute status from dateOfExpiry — no stored field needed
alumniJobSchema.virtual('status').get(function () {
  if (!this.dateOfExpiry) return 'ACTIVE';
  return new Date(this.dateOfExpiry) < new Date() ? 'EXPIRED' : 'ACTIVE';
});

alumniJobSchema.index({ alumniId: 1 });
alumniJobSchema.index({ dateOfExpiry: 1 });

module.exports = mongoose.model('AlumniJob', alumniJobSchema);
