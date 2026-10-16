const mongoose = require('mongoose');

const academicResourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    subject: {
      type: String,
      required: true,
      trim: true
    },

    fileUrl: {
      type: String,
      required: true
    },

    publicId: {
      type: String,
      required: true
    },

    fileData: {
      type: String, // Base64 encoded file content
      default: null
    },

    mimeType: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  'AcademicResource',
  academicResourceSchema
);