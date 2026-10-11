const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    announcement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Announcement',
      required: true
    },

    student: {
      type: String,
      required: true
    },

    file: {
      type: String,
      required: true
    },

    submittedAt: {
      type: Date,
      default: Date.now
    },

    status: {
      type: String,
      enum: ['submitted', 'late'],
      default: 'submitted'
    },

    // Marks given by faculty
    marks: {
      type: Number,
      min: 0,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Submission', submissionSchema);