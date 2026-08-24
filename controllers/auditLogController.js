const AuditLog = require('../models/AuditLog');

// Get Audit Logs (with search and limit)
exports.getAuditLogs = async (req, res) => {
  try {
    const { limit = 50, action } = req.query;
    const filter = {};

    if (action && action !== 'ALL') {
      filter.action = action;
    }

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10) || 50);

    return res.status(200).json(logs);
  } catch (error) {
    console.error('Fetch Audit Logs Error:', error);
    return res.status(500).json({ message: 'Error fetching audit logs' });
  }
};
