const mongoose = require('mongoose');

const systemAnnouncementSchema = new mongoose.Schema(
  {
    announcementId: {
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
    // Either description (text) or fileUrl (Cloudinary) — at least one required (enforced in controller)
    description: {
      type: String,
      trim: true,
      default: '',
    },
    fileUrl: {
      type: String,
      default: null,
    },
    // Departments this announcement targets; empty array means all departments
    departments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

systemAnnouncementSchema.index({ createdAt: -1 });
systemAnnouncementSchema.index({ departments: 1 });

module.exports = mongoose.model('SystemAnnouncement', systemAnnouncementSchema);
