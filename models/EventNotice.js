const mongoose = require('mongoose');

const eventNoticeSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    eventDate: {
      type: Date,
      required: true,
    },
    eventTime: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: String,
      trim: true,
      default: '',
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: true,
    },
    organizer: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      contact: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
      },
    },
    category: {
      type: String,
      required: true,
      enum: ['ACADEMIC', 'SPORTS', 'CULTURAL', 'WORKSHOP', 'SEMINAR', 'CONFERENCE', 'SOCIAL', 'OTHER'],
      default: 'OTHER',
      uppercase: true,
    },
    targetAudience: {
      type: [String],
      enum: ['STUDENTS', 'STAFF', 'FACULTY', 'ALL'],
      default: ['ALL'],
      uppercase: true,
    },
    registrationRequired: {
      type: Boolean,
      default: false,
    },
    registrationDeadline: {
      type: Date,
      default: null,
    },
    maxParticipants: {
      type: Number,
      default: null,
      min: 1,
    },
    status: {
      type: String,
      required: true,
      enum: ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'],
      default: 'PUBLISHED',
      uppercase: true,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
eventNoticeSchema.index({ eventDate: 1, status: 1 });
eventNoticeSchema.index({ category: 1 });
eventNoticeSchema.index({ publishedBy: 1 });

module.exports = mongoose.model('EventNotice', eventNoticeSchema);
