const mongoose = require('mongoose');

const alumniSchema = new mongoose.Schema(
  {
    alumniId: {
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
    graduationYear: {
      type: Number,
      required: true,
    },
    jobTitle: {
      type: String,
      trim: true,
      default: '',
    },
    currentCompany: {
      type: String,
      trim: true,
      default: '',
    },
    // Social / professional URLs
    socialLinks: {
      linkedin: { type: String, trim: true, default: '' },
      instagram: { type: String, trim: true, default: '' },
      twitter: { type: String, trim: true, default: '' },
      github: { type: String, trim: true, default: '' },
      portfolio: { type: String, trim: true, default: '' },
      other: { type: String, trim: true, default: '' },
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

alumniSchema.index({ graduationYear: 1 });
alumniSchema.index({ name: 'text', currentCompany: 'text', jobTitle: 'text' });

module.exports = mongoose.model('Alumni', alumniSchema);
