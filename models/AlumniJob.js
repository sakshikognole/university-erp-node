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
    // D11: Application Link is now required (no default empty string)
    applicationLink: {
      type: String,
      required: true,
      trim: true,
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

// Performance: existing indexes
alumniJobSchema.index({ alumniId: 1 });
alumniJobSchema.index({ dateOfExpiry: 1 });
// Performance: compound index for the common search/filter query pattern
alumniJobSchema.index({ createdAt: -1 });
// Performance: text index for keyword search across jobId, company, role
alumniJobSchema.index({ jobId: 'text', company: 'text', role: 'text' });

module.exports = mongoose.model('AlumniJob', alumniJobSchema);
