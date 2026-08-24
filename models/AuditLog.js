const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    performedBy: {
      type: String,
      required: true,
    },
    target: {
      type: String,
      default: 'System',
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'WARNING', 'FAILED'],
      default: 'SUCCESS',
    },
    details: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
